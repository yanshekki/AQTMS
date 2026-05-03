// ── Grok Provider (xAI, OpenAI-compatible API) ──

import { OpenAIProvider } from './OpenAIProvider';
import type { AIProviderConfig } from './BaseAIProvider';

export class GrokProvider extends OpenAIProvider {
  public override readonly providerName: string = 'GROK';

  constructor(config: AIProviderConfig) {
    super({
      ...config,
      baseURL: config.baseURL ?? 'https://api.x.ai/v1',
      model: config.model ?? 'grok-2',
    });
  }
}
