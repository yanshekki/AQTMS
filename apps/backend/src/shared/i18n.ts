// ── Simple i18n for backend — reads Accept-Language header ──
type Lang = 'en' | 'zh';

const messages: Record<string, Record<Lang, string>> = {
  // ── Auth ──
  'auth.unauthorized': { en: 'Authentication required', zh: '需要身份驗證' },
  'auth.invalid_signature': { en: 'Invalid signature format', zh: '簽名格式無效' },
  'auth.signature_failed': { en: 'Signature verification failed — wrong wallet', zh: '簽名驗證失敗 — 錢包地址不符' },
  'auth.user_not_found': { en: 'User not found — request a challenge first', zh: '用戶不存在 — 請先請求登入挑戰' },
  'auth.no_token': { en: 'No token provided', zh: '未提供 Token' },

  // ── Validation ──
  'validation.failed': { en: 'Request validation failed', zh: '請求驗證失敗' },

  // ── Trade ──
  'trade.not_found': { en: 'Trade not found', zh: '交易不存在' },
  'trade.execution_failed': { en: 'Trade execution failed', zh: '交易執行失敗' },
  'trade.cancel_failed': { en: 'Trade cancellation failed', zh: '交易取消失敗' },
  'trade.score_below_threshold': { en: 'Score below threshold', zh: '評分低於閾值' },
  'trade.skipped_threshold': { en: 'Trade skipped — score below threshold', zh: '跳過交易 — 評分低於閾值' },

  // ── Exchange ──
  'exchange.not_found': { en: 'Exchange account not found', zh: '交易所帳戶不存在' },
  'exchange.connect_failed': { en: 'Failed to connect exchange', zh: '交易所連接失敗' },
  'exchange.invalid_request': { en: 'Invalid exchange connection request', zh: '無效的交易所連接請求' },
  'exchange.not_owner': { en: 'You can only delete your own exchange accounts', zh: '你只能刪除自己的交易所帳戶' },
  'exchange.user_not_auth': { en: 'User not authenticated', zh: '用戶未認證' },
  'exchange.id_required': { en: 'Exchange ID required', zh: '需要 Exchange ID' },

  // ── Rules ──
  'rule.not_found': { en: 'Rule not found', zh: '規則不存在' },

  // ── News ──
  'news.not_found': { en: 'News not found', zh: '新聞不存在' },

  // ── Backtest ──
  'backtest.not_found': { en: 'Backtest not found', zh: '回測不存在' },
  'backtest.insufficient_data': { en: 'Insufficient data', zh: '數據不足' },

  // ── Notifications ──
  'notification.not_found': { en: 'Notification not found', zh: '通知不存在' },

  // ── Permission ──
  'permission.missing': { en: 'Missing required permissions', zh: '缺少必要權限' },
  'permission.forbidden': { en: 'Forbidden', zh: '禁止訪問' },

  // ── Rate Limit ──
  'rate_limit': { en: 'Too many requests, please try again later', zh: '請求過多，請稍後再試' },

  // ── Internal ──
  'internal_error': { en: 'An unexpected error occurred', zh: '發生意外錯誤' },

  // ── AI ──
  'ai.no_provider': { en: 'No AI provider available', zh: '無可用 AI 模型' },
  'ai.processing_failed': { en: 'AI processing failed', zh: 'AI 處理失敗' },
  'ai.all_failed': { en: 'All AI providers failed', zh: '所有 AI 模型失敗' },

  // ── Error code → i18n key mappings (used by error middleware) ──
  'UNAUTHORIZED': { en: 'Authentication required', zh: '需要身份驗證' },
  'VALIDATION_ERROR': { en: 'Request validation failed', zh: '請求驗證失敗' },
  'FORBIDDEN': { en: 'Forbidden', zh: '禁止訪問' },
  'NOT_FOUND': { en: 'Resource not found', zh: '資源不存在' },
  'EXCHANGE_NOT_FOUND': { en: 'Exchange account not found', zh: '交易所帳戶不存在' },
  'TRADE_EXECUTION_FAILED': { en: 'Trade execution failed', zh: '交易執行失敗' },
  'TRADE_CANCEL_FAILED': { en: 'Trade cancellation failed', zh: '交易取消失敗' },
  'RATE_LIMITED': { en: 'Too many requests, please try again later', zh: '請求過多，請稍後再試' },
  'INTERNAL_ERROR': { en: 'An unexpected error occurred', zh: '發生意外錯誤' },
  'DOMAIN_ERROR': { en: 'Invalid request', zh: '請求無效' },
  'CONFLICT': { en: 'Resource conflict', zh: '資源衝突' },
  'CIRCUIT_BREAKER_OPEN': { en: 'Service temporarily unavailable', zh: '服務暫時不可用' },
  'INFRA_ERROR': { en: 'Infrastructure error', zh: '基礎設施錯誤' },

  // ── Rate limit sub-messages ──
  'rate_limit.too_many_requests': { en: 'Too many requests from this IP', zh: '此 IP 請求過多' },
  'rate_limit.user_limit': { en: 'User rate limit exceeded', zh: '用戶請求限制已達上限' },
  'rate_limit.action_limit': { en: 'Action rate limit exceeded', zh: '操作請求限制已達上限' },
  'rate_limit.auth_attempts': { en: 'Too many auth attempts', zh: '登入嘗試過多' },
};

/**
 * Translate a key to the target language.
 * Falls back to English, then to the key itself if not found.
 */
export function t(key: string, lang?: string): string {
  const l = (lang === 'zh' || lang === 'zh-HK' || lang === 'zh-TW') ? 'zh' : 'en';
  return messages[key]?.[l] ?? messages[key]?.en ?? key;
}

/**
 * Detect preferred language from Accept-Language header.
 * Supports zh, zh-HK, zh-TW (returns 'zh'), everything else → 'en'.
 */
export function detectLang(req: { headers?: { 'accept-language'?: string | string[] | undefined } }): Lang {
  const header = req.headers?.['accept-language'];
  const value = Array.isArray(header) ? (header[0] ?? '') : (header ?? '');
  if (value.includes('zh')) return 'zh';
  return 'en';
}
