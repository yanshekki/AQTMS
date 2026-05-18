// ── Environment Config (Zod-validated at startup) ──

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY must be 64 hex characters (32 bytes)'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let _env: EnvConfig | null = null;

export function loadEnv(): EnvConfig {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // Fatal bootstrap error — console.error is appropriate here as no logger/DI exists yet.
    console.error('❌ Invalid environment configuration:');
    console.error(
      result.error.issues
        .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
        .join('\n'),
    );
    process.exit(1);
  }

  _env = result.data;
  return _env;
}

export function getEnv(): EnvConfig {
  if (!_env) return loadEnv();
  return _env;
}
