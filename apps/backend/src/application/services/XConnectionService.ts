// ── X (Twitter) Connection Service ──

export class XConnectionService {
  async validateBearerToken(bearerToken: string): Promise<{ valid: boolean; error?: string; errorCode?: string }> {
    try {
      const response = await fetch('https://api.twitter.com/2/users/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${bearerToken}` },
      });

      if (response.ok) {
        return { valid: true };
      }

      return {
        valid: false,
        error: 'X Bearer Token 無效或已過期，請重新生成',
        errorCode: 'INVALID_BEARER_TOKEN',
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || '無法驗證 X Bearer Token',
        errorCode: 'X_VALIDATION_FAILED',
      };
    }
  }

  async testUserAccess(bearerToken: string, username: string): Promise<{ accessible: boolean; error?: string; errorCode?: string }> {
    try {
      const cleanUsername = username.replace('@', '');
      const response = await fetch(
        `https://api.twitter.com/2/users/by/username/${cleanUsername}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${bearerToken}` },
        }
      );

      if (response.ok) {
        return { accessible: true };
      }

      return {
        accessible: false,
        error: '找不到該 X 用戶，請確認 Username 是否正確',
        errorCode: 'USER_NOT_FOUND',
      };
    } catch (error: any) {
      return {
        accessible: false,
        error: error.message || '無法訪問該 X 用戶',
        errorCode: 'X_USER_ACCESS_FAILED',
      };
    }
  }
}
