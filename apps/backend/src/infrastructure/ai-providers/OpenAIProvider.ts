// ── OpenAI Provider ──

import OpenAI from 'openai';
import { BaseAIProvider, type AIProviderConfig, type AIResponse, type AIScoringResult } from './BaseAIProvider';
import { InfraError } from '../../shared/errors';

export class OpenAIProvider extends BaseAIProvider {
  public readonly providerName: string = 'OPENAI';
  private client: OpenAI;

  constructor(config: AIProviderConfig) {
    super(config);
    this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
  }

  async generateResponse(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    const start = Date.now();
    try {
      const completion = await this.client.chat.completions.create({
        model: this.config.model ?? 'gpt-4o',
        messages: [
          ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
          { role: 'user' as const, content: prompt },
        ],
        max_tokens: this.config.maxTokens ?? 1024,
        temperature: this.config.temperature ?? 0.3,
      });

      const choice = completion.choices[0]!;
      return {
        content: choice.message.content ?? '',
        model: completion.model,
        usage: {
          promptTokens: completion.usage?.prompt_tokens ?? 0,
          completionTokens: completion.usage?.completion_tokens ?? 0,
          totalTokens: completion.usage?.total_tokens ?? 0,
          costUsd: this.estimateCost(completion.usage?.prompt_tokens ?? 0, completion.usage?.completion_tokens ?? 0),
        },
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      throw new InfraError(
        `OpenAI call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AI_PROVIDER_ERROR',
      );
    }
  }

  async verifyTruth(content: string): Promise<AIScoringResult> {
    const prompt = `Analyze the following news for truthfulness. Return a JSON with: truthScore (0-100), confidenceScore (0-100), reasoning, affectedAssets (array), suggestedAction, urgency.\n\nNews: ${content}`;
    const response = await this.generateResponse(prompt, 'You are a financial news fact-checker. Return ONLY valid JSON.');
    return this.parseScoringResult(response.content);
  }

  async scoreNews(content: string, _context?: string): Promise<AIScoringResult> {
    const prompt = `Score this financial news for trading impact. Return JSON with: truthScore, sentimentScore (-100 to +100), relevanceScore (0-100), confidenceScore, reasoning, affectedAssets, suggestedAction (BUY/SELL/HOLD/IGNORE), urgency (LOW/MEDIUM/HIGH/CRITICAL).\n\nNews: ${content}`;
    const response = await this.generateResponse(prompt, 'You are a quantitative trading analyst. Return ONLY valid JSON.');
    return this.parseScoringResult(response.content);
  }

  async makeDecision(context: string): Promise<{ action: string; confidence: number; reasoning: string }> {
    const prompt = `Based on this context, what trading action should be taken? Return JSON with: action (BUY/SELL/HOLD), confidence (0-100), reasoning.\n\nContext: ${context}`;
    const response = await this.generateResponse(prompt, 'You are a senior quantitative trader. Return ONLY valid JSON with action, confidence, reasoning.');
    try {
      const result = JSON.parse(response.content) as { action: string; confidence: number; reasoning: string };
      return result;
    } catch {
      return { action: 'HOLD', confidence: 0, reasoning: 'Failed to parse AI response' };
    }
  }

  private parseScoringResult(raw: string): AIScoringResult {
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as AIScoringResult;
      }
      throw new Error('No JSON found in response');
    } catch {
      return {
        truthScore: 50, sentimentScore: 0, relevanceScore: 50, confidenceScore: 30,
        reasoning: raw.slice(0, 500),
        affectedAssets: [], suggestedAction: 'HOLD', urgency: 'LOW',
      };
    }
  }

  private estimateCost(promptTokens: number, completionTokens: number): number {
    // GPT-4o pricing: $2.50/1M input, $10/1M output
    return (promptTokens / 1_000_000) * 2.5 + (completionTokens / 1_000_000) * 10;
  }
}
