// ── DeepSeek Provider (OpenAI-compatible API) ──

import { OpenAIProvider } from './OpenAIProvider';
import type { AIProviderConfig } from './BaseAIProvider';

export class DeepSeekProvider extends OpenAIProvider {
  public override readonly providerName: string = 'DEEPSEEK';

  constructor(config: AIProviderConfig) {
    super({
      ...config,
      baseURL: config.baseURL ?? 'https://api.deepseek.com/v1',
      model: config.model ?? 'deepseek-chat',
    });
  }
}
