// ── X (Twitter) Connection Service (Improved Error Messages) ──

import axios from 'axios';

export class XConnectionService {
  async validateBearerToken(bearerToken: string): Promise<{ valid: boolean; error?: string; errorCode?: string }> {
    try {
      const response = await axios.get('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${bearerToken}` },
        timeout: 8000,
      });

      return { valid: response.status === 200 };
    } catch (error: any) {
      const status = error.response?.status;
      const title = error.response?.data?.title || '';
      const detail = error.response?.data?.detail || '';

      if (status === 401) {
        return {
          valid: false,
          error: 'X Bearer Token 無效或已過期，請重新生成',
          errorCode: 'INVALID_BEARER_TOKEN',
        };
      }

      if (title.includes('Unauthorized') || detail.includes('Invalid')) {
        return {
          valid: false,
          error: 'X Bearer Token 不正確，請檢查是否輸入錯誤',
          errorCode: 'INVALID_X_TOKEN',
        };
      }

      return {
        valid: false,
        error: detail || '無法驗證 X Bearer Token',
        errorCode: 'X_VALIDATION_FAILED',
      };
    }
  }

  async testUserAccess(bearerToken: string, username: string): Promise<{ accessible: boolean; error?: string; errorCode?: string }> {
    try {
      const cleanUsername = username.replace('@', '');
      const response = await axios.get(
        `https://api.twitter.com/2/users/by/username/${cleanUsername}`,
        {
          headers: { Authorization: `Bearer ${bearerToken}` },
          timeout: 8000,
        }
      );

      return { accessible: response.status === 200 };
    } catch (error: any) {
      const status = error.response?.status;

      if (status === 404) {
        return {
          accessible: false,
          error: '找不到該 X 用戶，請確認 Username 是否正確',
          errorCode: 'USER_NOT_FOUND',
        };
      }

      if (status === 401) {
        return {
          accessible: false,
          error: 'Bearer Token 無權限訪問該用戶',
          errorCode: 'USER_ACCESS_DENIED',
        };
      }

      return {
        accessible: false,
        error: '無法訪問該 X 用戶',
        errorCode: 'X_USER_ACCESS_FAILED',
      };
    }
  }
}
