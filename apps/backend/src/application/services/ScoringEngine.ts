// ── Scoring Engine ──
// Aggregates multi-AI scoring results into a composite score.
// Routes tasks to specialized AI models (Grok→verify, Gemini→score, DeepSeek→decide).

import { AIProviderRegistry } from '../../infrastructure/ai-providers/AIProviderRegistry';
import { logger } from '../../shared/logger';
import type { AIScoringResult } from '../../infrastructure/ai-providers/BaseAIProvider';

export interface CompositeScore {
  newsId: string;
  compositeScore: number;    // 0-100: overall trading relevance
  truthScore: number;        // 0-100
  sentimentScore: number;    // -100 to +100
  relevanceScore: number;    // 0-100
  confidenceScore: number;   // 0-100
  consensusLevel: 'HIGH' | 'MEDIUM' | 'LOW'; // AI agreement level
  verdict: string;
  affectedAssets: string[];
  suggestedAction: 'BUY' | 'SELL' | 'HOLD' | 'IGNORE';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  shouldTrade: boolean;      // Threshold check: compositeScore >= 80
  aiResponses: Array<{
    provider: string;
    task: string;
    result: AIScoringResult;
  }>;
  processedAt: Date;
}

export class ScoringEngine {
  constructor(
    private readonly aiRegistry: AIProviderRegistry,
    private readonly compositeThreshold = 80,
  ) {}

  async processNews(
    newsId: string,
    content: string,
  ): Promise<CompositeScore> {
    const start = Date.now();
    const responses: CompositeScore['aiResponses'] = [];

    // Phase 1: Truth Verification — prefer Grok, fallback to any
    const truthResult = await this.runWithFallback(
      'GROK',
      (provider) => provider.verifyTruth(content),
      responses,
      'verify',
    );

    // Phase 2: Sentiment + Relevance Scoring — prefer Gemini, fallback to any
    const scoreResult = await this.runWithFallback(
      'GEMINI',
      (provider) => provider.scoreNews(content),
      responses,
      'score',
    );

    // Phase 3: Trading Decision — prefer DeepSeek, fallback to any
    const decisionResult = await this.runDecision(
      'DEEPSEEK',
      content,
      truthResult,
      scoreResult,
      responses,
    );

    // Aggregate scores
    const truthScore = this.weightedAverage([
      { value: truthResult.truthScore, weight: 0.5 },
      { value: scoreResult.truthScore, weight: 0.3 },
      { value: truthResult.confidenceScore > 70 ? truthResult.truthScore : 50, weight: 0.2 },
    ]);

    const sentimentScore = scoreResult.sentimentScore;
    const relevanceScore = this.weightedAverage([
      { value: scoreResult.relevanceScore, weight: 0.6 },
      { value: truthResult.relevanceScore, weight: 0.4 },
    ]);

    const confidenceScore = this.weightedAverage([
      { value: truthResult.confidenceScore, weight: 0.4 },
      { value: scoreResult.confidenceScore, weight: 0.4 },
      { value: decisionResult.confidence, weight: 0.2 },
    ]);

    // Composite: truth * 0.35 + sentiment_abs * 0.15 + relevance * 0.40 + confidence * 0.10
    const compositeScore = Math.min(100,
      truthScore * 0.35 +
      (Math.abs(sentimentScore) / 100) * 100 * 0.15 +
      relevanceScore * 0.40 +
      confidenceScore * 0.10,
    );

    // Collect unique assets
    const allAssets = new Set([
      ...truthResult.affectedAssets,
      ...scoreResult.affectedAssets,
    ]);

    // Consensus check
    const actionVotes = [
      truthResult.suggestedAction,
      scoreResult.suggestedAction,
      (decisionResult.action === 'BUY' ? 'BUY' : decisionResult.action === 'SELL' ? 'SELL' : 'HOLD'),
    ] as Array<'BUY' | 'SELL' | 'HOLD' | 'IGNORE'>;
    const consensusLevel = this.calculateConsensus(actionVotes);

    const shouldTrade = compositeScore >= this.compositeThreshold;

    const result: CompositeScore = {
      newsId,
      compositeScore: Math.round(compositeScore * 100) / 100,
      truthScore: Math.round(truthScore * 100) / 100,
      sentimentScore: Math.round(sentimentScore * 100) / 100,
      relevanceScore: Math.round(relevanceScore * 100) / 100,
      confidenceScore: Math.round(confidenceScore * 100) / 100,
      consensusLevel,
      verdict: compositeScore >= 80 ? 'STRONG_SIGNAL' : compositeScore >= 60 ? 'MODERATE' : 'WEAK',
      affectedAssets: [...allAssets],
      suggestedAction: shouldTrade ? decisionResult.action : 'HOLD',
      urgency: compositeScore >= 90 ? 'CRITICAL' : compositeScore >= 80 ? 'HIGH' : compositeScore >= 60 ? 'MEDIUM' : 'LOW',
      shouldTrade,
      aiResponses: responses,
      processedAt: new Date(),
    };

    logger.info(
      { newsId, compositeScore, consensusLevel, suggestedAction: result.suggestedAction, latency: Date.now() - start },
      'News processed by scoring engine',
    );

    return result;
  }

  // ── Private ──

  private async runWithFallback(
    preferredType: Parameters<AIProviderRegistry['getByType']>[0],
    task: (provider: import('../../infrastructure/ai-providers/BaseAIProvider').BaseAIProvider) => Promise<AIScoringResult>,
    responses: CompositeScore['aiResponses'],
    taskName: string,
  ): Promise<AIScoringResult> {
    const preferred = this.aiRegistry.getByType(preferredType).filter((p) => p.isHealthy);
    const entry = preferred[0] ?? this.aiRegistry.getHealthy()[0];

    if (!entry) {
      logger.warn(`No AI provider available for task: ${taskName}`);
      return { truthScore: 50, sentimentScore: 0, relevanceScore: 50, confidenceScore: 30, reasoning: 'No AI available', affectedAssets: [], suggestedAction: 'HOLD', urgency: 'LOW' };
    }

    try {
      const result = await task(entry.provider);
      responses.push({ provider: `${entry.type}:${entry.name}`, task: taskName, result });
      return result;
    } catch (error) {
      logger.warn({ error, provider: entry.type }, `AI task failed: ${taskName}`);
      this.aiRegistry.markUnhealthy(entry.id);

      // Try fallback
      const fallback = this.aiRegistry.getFallback(preferredType, entry.id);
      if (fallback) {
        try {
          const result = await task(fallback.provider);
          responses.push({ provider: `${fallback.type}:${fallback.name}`, task: taskName, result });
          return result;
        } catch {
          logger.error(`All AI providers failed for task: ${taskName}`);
        }
      }

      return { truthScore: 50, sentimentScore: 0, relevanceScore: 50, confidenceScore: 30, reasoning: 'AI processing failed', affectedAssets: [], suggestedAction: 'HOLD', urgency: 'LOW' };
    }
  }

  private async runDecision(
    preferredType: Parameters<AIProviderRegistry['getByType']>[0],
    content: string,
    truth: AIScoringResult,
    score: AIScoringResult,
    responses: CompositeScore['aiResponses'],
  ): Promise<{ action: 'BUY' | 'SELL' | 'HOLD'; confidence: number }> {
    const context = JSON.stringify({
      content,
      truthAssessment: { score: truth.truthScore, verdict: truth.reasoning },
      marketAssessment: { sentiment: score.sentimentScore, relevance: score.relevanceScore, assets: score.affectedAssets },
    });

    const preferred = this.aiRegistry.getByType(preferredType).filter((p) => p.isHealthy);
    const entry = preferred[0] ?? this.aiRegistry.getHealthy()[0];

    if (!entry) {
      return { action: 'HOLD', confidence: 0 };
    }

    try {
      const result = await entry.provider.makeDecision(context);
      const action = result.action === 'IGNORE' ? 'HOLD' : (result.action as 'BUY' | 'SELL' | 'HOLD');
      responses.push({ provider: `${entry.type}:${entry.name}`, task: 'decide', result: { truthScore: 0, sentimentScore: 0, relevanceScore: 0, confidenceScore: result.confidence, reasoning: result.reasoning, affectedAssets: [], suggestedAction: action, urgency: 'LOW' } });
      return { action, confidence: result.confidence };
    } catch {
      this.aiRegistry.markUnhealthy(entry.id);
      logger.warn({ provider: entry.type }, 'Decision AI failed, trying fallback');

      // Try fallback provider for decision
      const fallback = this.aiRegistry.getFallback(preferredType, entry.id);
      if (fallback) {
        try {
          const result = await fallback.provider.makeDecision(context);
          const action = result.action === 'IGNORE' ? 'HOLD' : (result.action as 'BUY' | 'SELL' | 'HOLD');
          responses.push({ provider: `${fallback.type}:${fallback.name}`, task: 'decide', result: { truthScore: 0, sentimentScore: 0, relevanceScore: 0, confidenceScore: result.confidence, reasoning: result.reasoning, affectedAssets: [], suggestedAction: action, urgency: 'LOW' } });
          return { action, confidence: result.confidence };
        } catch {
          logger.error('All decision AI providers failed');
        }
      }

      return { action: 'HOLD', confidence: 0 };
    }
  }

  private weightedAverage(items: Array<{ value: number; weight: number }>): number {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight === 0) return 0;
    return items.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
  }

  private calculateConsensus(
    actions: Array<'BUY' | 'SELL' | 'HOLD' | 'IGNORE'>,
  ): CompositeScore['consensusLevel'] {
    const nonIgnore = actions.filter((a) => a !== 'IGNORE');
    if (nonIgnore.length < 2) return 'LOW';
    const allSame = nonIgnore.every((a) => a === nonIgnore[0]);
    if (allSame) return 'HIGH';
    const buys = nonIgnore.filter((a) => a === 'BUY').length;
    const sells = nonIgnore.filter((a) => a === 'SELL').length;
    const holds = nonIgnore.filter((a) => a === 'HOLD').length;
    const maxSame = Math.max(buys, sells, holds);
    return maxSame >= nonIgnore.length - 1 ? 'MEDIUM' : 'LOW';
  }
}
