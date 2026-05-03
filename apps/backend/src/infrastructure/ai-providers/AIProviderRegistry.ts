// ── AI Provider Registry ──

import { BaseAIProvider, type AIProviderConfig } from './BaseAIProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { DeepSeekProvider } from './DeepSeekProvider';
import { GrokProvider } from './GrokProvider';
import { GeminiProvider } from './GeminiProvider';
import { OllamaProvider } from './OllamaProvider';
import { InfraError } from '../../shared/errors';

export type AIProviderType = 'OPENAI' | 'DEEPSEEK' | 'GROK' | 'GEMINI' | 'OLLAMA';

export interface AIProviderEntry {
  id: string;
  type: AIProviderType;
  name: string;
  provider: BaseAIProvider;
  config: AIProviderConfig;
  isHealthy: boolean;
}

export class AIProviderRegistry {
  private providers = new Map<string, AIProviderEntry>();

  register(id: string, type: AIProviderType, name: string, config: AIProviderConfig): AIProviderEntry {
    let provider: BaseAIProvider;

    switch (type) {
      case 'OPENAI': provider = new OpenAIProvider(config); break;
      case 'DEEPSEEK': provider = new DeepSeekProvider(config); break;
      case 'GROK': provider = new GrokProvider(config); break;
      case 'GEMINI': provider = new GeminiProvider(config); break;
      case 'OLLAMA': provider = new OllamaProvider(config); break;
      default: throw new InfraError(`Unknown AI provider type: ${type}`);
    }

    const entry: AIProviderEntry = { id, type, name, provider, config, isHealthy: true };
    this.providers.set(id, entry);
    return entry;
  }

  get(id: string): AIProviderEntry | undefined {
    return this.providers.get(id);
  }

  getByType(type: AIProviderType): AIProviderEntry[] {
    return [...this.providers.values()].filter((p) => p.type === type);
  }

  getAll(): AIProviderEntry[] {
    return [...this.providers.values()];
  }

  getHealthy(): AIProviderEntry[] {
    return [...this.providers.values()].filter((p) => p.isHealthy);
  }

  markUnhealthy(id: string): void {
    const entry = this.providers.get(id);
    if (entry) entry.isHealthy = false;
  }

  markHealthy(id: string): void {
    const entry = this.providers.get(id);
    if (entry) entry.isHealthy = true;
  }

  // Get fallback provider if primary is unhealthy
  getFallback(type: AIProviderType, excludeId?: string): AIProviderEntry | undefined {
    return this.getHealthy().find((p) => p.type === type && p.id !== excludeId);
  }

  get size(): number {
    return this.providers.size;
  }
}

// Global singleton
export const aiProviderRegistry = new AIProviderRegistry();
