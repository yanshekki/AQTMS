// ── Base AI Provider (Abstract Port) ──
// All AI providers implement this interface. Core logic depends only on this port.

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number;
  };
  latencyMs: number;
}

export interface AIScoringResult {
  truthScore: number;       // 0-100: how likely the news is true
  sentimentScore: number;   // -100 to +100: negative to positive
  relevanceScore: number;   // 0-100: relevance to trading
  confidenceScore: number;  // 0-100: AI's confidence in its assessment
  reasoning: string;
  affectedAssets: string[]; // e.g., ['BTC', 'ETH']
  suggestedAction: 'BUY' | 'SELL' | 'HOLD' | 'IGNORE';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export abstract class BaseAIProvider {
  public abstract readonly providerName: string;
  protected readonly config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  abstract generateResponse(prompt: string, systemPrompt?: string): Promise<AIResponse>;

  // Specialized tasks
  abstract verifyTruth(content: string): Promise<AIScoringResult>;
  abstract scoreNews(content: string, context?: string): Promise<AIScoringResult>;
  abstract makeDecision(context: string): Promise<{ action: string; confidence: number; reasoning: string }>;
}
