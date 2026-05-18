import { Logger } from '@nestjs/common';
// ── Ollama Provider (Local LLM) ──

import { BaseAIProvider, type AIProviderConfig, type AIResponse, type AIScoringResult } from './BaseAIProvider';
import { InfraError } from '../../shared/errors';

export class OllamaProvider extends BaseAIProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  public readonly providerName = 'OLLAMA';
  private readonly baseURL: string;

  constructor(config: AIProviderConfig) {
    super(config);
    this.baseURL = config.baseURL ?? 'http://localhost:11434';
  }

  async generateResponse(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseURL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model ?? 'llama3.2',
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
          stream: false,
          options: {
            temperature: this.config.temperature ?? 0.3,
            num_predict: this.config.maxTokens ?? 1024,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}`);
      }

      const result = (await response.json()) as { response: string; eval_count?: number; prompt_eval_count?: number };
      return {
        content: result.response,
        model: this.config.model ?? 'llama3.2',
        usage: {
          promptTokens: result.prompt_eval_count ?? 0,
          completionTokens: result.eval_count ?? 0,
          totalTokens: (result.prompt_eval_count ?? 0) + (result.eval_count ?? 0),
          costUsd: 0, // Local = free
        },
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      throw new InfraError(
        `Ollama call failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'AI_PROVIDER_ERROR',
      );
    }
  }

  async verifyTruth(content: string): Promise<AIScoringResult> {
    const response = await this.generateResponse(
      `Is this news true or false? Rate truth 0-100. Reply ONLY with JSON:\n{"truthScore":number,"confidenceScore":number,"reasoning":"...","affectedAssets":[],"suggestedAction":"HOLD","urgency":"LOW","sentimentScore":0,"relevanceScore":0}\n\nNews: ${content}`,
      'You are a fact-checker. Reply ONLY with JSON.',
    );
    return this.parse(response.content);
  }

  async scoreNews(content: string, _context?: string): Promise<AIScoringResult> {
    const response = await this.generateResponse(
      `Score this trading news 0-100 relevance. Reply ONLY with JSON:\n{"truthScore":0,"sentimentScore":0,"relevanceScore":number,"confidenceScore":number,"reasoning":"...","affectedAssets":[],"suggestedAction":"HOLD","urgency":"LOW"}\n\nNews: ${content}`,
      'You are a trading analyst. Reply ONLY with JSON.',
    );
    return this.parse(response.content);
  }

  async makeDecision(context: string): Promise<{ action: string; confidence: number; reasoning: string }> {
    const response = await this.generateResponse(
      `What trading action? Reply ONLY: {"action":"BUY|SELL|HOLD","confidence":number,"reasoning":"..."}\n\nContext: ${context}`,
    );
    try {
      return JSON.parse(response.content.match(/\{[\s\S]*\}/)?.[0] ?? '{"action":"HOLD","confidence":0}') as { action: string; confidence: number; reasoning: string };
    } catch (error) {
      this.logger?.warn(`Ollama makeDecision JSON parse failed: ${error instanceof Error ? error.message : error}`);
      return { action: 'HOLD', confidence: 0, reasoning: 'Parse failed' };
    }
  }

  private parse(raw: string): AIScoringResult {
    try {
      return JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}') as AIScoringResult;
    } catch (error) {
      this.logger?.warn(`Ollama parse JSON parse failed: ${error instanceof Error ? error.message : error}`);
      return { truthScore: 50, sentimentScore: 0, relevanceScore: 50, confidenceScore: 30, reasoning: raw.slice(0, 500), affectedAssets: [], suggestedAction: 'HOLD', urgency: 'LOW' };
    }
  }
}
