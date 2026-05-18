// ── Google Gemini Provider ──

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { Logger } from '@nestjs/common';
import { BaseAIProvider, type AIProviderConfig, type AIResponse, type AIScoringResult } from './BaseAIProvider';
import { InfraError } from '../../shared/errors';

export class GeminiProvider extends BaseAIProvider {
  public readonly providerName = 'GEMINI';
  private model: GenerativeModel;

  constructor(config: AIProviderConfig) {
    super(config);
    const genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = genAI.getGenerativeModel({ model: config.model ?? 'gemini-2.0-flash' });
  }

  async generateResponse(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    const start = Date.now();
    try {
      const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
      const result = await this.model.generateContent(fullPrompt);
      const response = result.response;

      return {
        content: response.text(),
        model: this.config.model ?? 'gemini-2.0-flash',
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
          costUsd: 0, // Gemini Flash is free tier
        },
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      throw new InfraError(
        `Gemini call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AI_PROVIDER_ERROR',
      );
    }
  }

  async verifyTruth(content: string): Promise<AIScoringResult> {
    const response = await this.generateResponse(
      `Analyze this news for truthfulness. Return ONLY valid JSON with: truthScore (0-100), confidenceScore (0-100), reasoning, affectedAssets (array of symbols), suggestedAction (BUY/SELL/HOLD/IGNORE), urgency (LOW/MEDIUM/HIGH/CRITICAL).\n\nNews: ${content}`,
      'You are a financial news fact-checker.',
    );
    return this.parseResult(response.content);
  }

  async scoreNews(content: string, _context?: string): Promise<AIScoringResult> {
    const response = await this.generateResponse(
      `Score this financial news for trading impact. Return ONLY valid JSON with: truthScore, sentimentScore (-100 to +100), relevanceScore (0-100), confidenceScore, reasoning, affectedAssets, suggestedAction, urgency.\n\nNews: ${content}`,
      'You are a quantitative trading analyst.',
    );
    return this.parseResult(response.content);
  }

  async makeDecision(context: string): Promise<{ action: string; confidence: number; reasoning: string }> {
    const response = await this.generateResponse(
      `Based on this context, what trading action should be taken? Return ONLY JSON: {"action":"BUY|SELL|HOLD","confidence":0-100,"reasoning":"..."}\n\nContext: ${context}`,
      'You are a senior quantitative trader.',
    );
    try {
      return JSON.parse(response.content.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as { action: string; confidence: number; reasoning: string };
    } catch (error) {
      this.logger?.warn(`Gemini makeDecision JSON parse failed: ${error instanceof Error ? error.message : error}`);
      return { action: 'HOLD', confidence: 0, reasoning: 'Failed to parse' };
    }
  }

  private parseResult(raw: string): AIScoringResult {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) as AIScoringResult : this.defaultResult(raw);
    } catch (error) {
      this.logger?.warn(`Gemini parseResult JSON parse failed: ${error instanceof Error ? error.message : error}`);
      return this.defaultResult(raw);
    }
  }

  private defaultResult(raw: string): AIScoringResult {
    return { truthScore: 50, sentimentScore: 0, relevanceScore: 50, confidenceScore: 30, reasoning: raw.slice(0, 500), affectedAssets: [], suggestedAction: 'HOLD', urgency: 'LOW' };
  }
}
