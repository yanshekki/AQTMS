import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Exchange
  EXCHANGE_PROVIDER: Joi.string().valid('BINANCE', 'BYBIT').default('BINANCE'),

  // Binance
  BINANCE_API_KEY: Joi.string().allow('').optional(),
  BINANCE_API_SECRET: Joi.string().allow('').optional(),
  BINANCE_TESTNET: Joi.boolean().default(true),

  // Bybit
  BYBIT_API_KEY: Joi.string().allow('').optional(),
  BYBIT_API_SECRET: Joi.string().allow('').optional(),
  BYBIT_TESTNET: Joi.boolean().default(true),

  // Risk
  DAILY_LOSS_LIMIT: Joi.number().default(500),
});
