// ── Process News Use-Case ──
// Orchestrates: receive news → AI processing → scoring → persist → trigger strategy

import { PrismaClient } from '@prisma/client';
import type { NewsItem } from '../../infrastructure/adapters/datasources/BaseDataSourceAdapter';
import { ScoringEngine, type CompositeScore } from '../services/ScoringEngine';
import { logger } from '../../shared/logger';

const prisma = new PrismaClient();

export class ProcessNewsUseCase {
  private processingCount = 0;

  constructor(private readonly scoringEngine: ScoringEngine) {}

  async execute(newsItem: NewsItem): Promise<{
    newsId: string;
    saved: boolean;
    score?: CompositeScore;
    tradeTriggered: boolean;
  }> {
    this.processingCount++;
    const start = Date.now();

    try {
      // 1. Check if already processed (dedup)
      const existing = await prisma.newsEvent.findUnique({
        where: { source_sourceId: { source: newsItem.source, sourceId: newsItem.sourceId } },
      });

      let newsId: string;
      if (existing) {
        newsId = existing.id;
        if (existing.isProcessed) {
          return { newsId, saved: false, tradeTriggered: false };
        }
      } else {
        // 2. Save to DB
        const created = await prisma.newsEvent.create({
          data: {
            source: newsItem.source,
            sourceId: newsItem.sourceId,
            content: newsItem.content,
            language: newsItem.language,
          },
        });
        newsId = created.id;
      }

      // 3. Run through AI scoring pipeline
      logger.info({ newsId, source: newsItem.source, length: newsItem.content.length }, 'Processing news through AI pipeline');
      const compositeScore = await this.scoringEngine.processNews(newsId, newsItem.content);

      // 4. Persist scores
      await prisma.newsEvent.update({
        where: { id: newsId },
        data: {
          isProcessed: true,
          processedAt: new Date(),
          isFake: compositeScore.truthScore < 30,
          truthScore: compositeScore.truthScore,
          sentimentScore: compositeScore.sentimentScore,
          relevanceScore: compositeScore.relevanceScore,
          compositeScore: compositeScore.compositeScore,
          aiAnalysis: JSON.stringify(compositeScore),
        },
      });

      // 5. Create audit log
      await prisma.auditLog.create({
        data: {
          userId: 'system',
          action: 'news:processed',
          resource: 'news',
          resourceId: newsId,
          details: JSON.stringify({
            compositeScore: compositeScore.compositeScore,
            verdict: compositeScore.verdict,
            shouldTrade: compositeScore.shouldTrade,
            suggestedAction: compositeScore.suggestedAction,
          }),
        },
      });

      const elapsed = Date.now() - start;
      logger.info(
        {
          newsId,
          score: compositeScore.compositeScore,
          verdict: compositeScore.verdict,
          tradeTriggered: compositeScore.shouldTrade,
          elapsed,
          total: this.processingCount,
        },
        'News processed',
      );

      return {
        newsId,
        saved: true,
        score: compositeScore,
        tradeTriggered: compositeScore.shouldTrade,
      };
    } catch (error) {
      logger.error({ error }, 'News processing failed');
      return { newsId: 'error', saved: false, tradeTriggered: false };
    }
  }

  async runBatch(newsItems: NewsItem[]): Promise<number> {
    let processed = 0;
    let tradeSignals = 0;

    for (const item of newsItems) {
      const result = await this.execute(item);
      if (result.saved) processed++;
      if (result.tradeTriggered) tradeSignals++;
    }

    logger.info({ processed, tradeSignals, total: newsItems.length }, 'Batch news processing complete');
    return processed;
  }
}
