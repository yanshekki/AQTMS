// ── X (Twitter) Connection Service ──
// 負責驗證 X Bearer Token

import axios from 'axios';

export class XConnectionService {
  async validateBearerToken(bearerToken: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await axios.get('https://api.twitter.com/2/users/me', {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
        timeout: 8000,
      });

      return {
        valid: response.status === 200,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.title || error.response?.data?.detail || 'Invalid X Bearer Token',
      };
    }
  }

  async testUserAccess(bearerToken: string, username: string): Promise<{ accessible: boolean; error?: string }> {
    try {
      const cleanUsername = username.replace('@', '');
      const response = await axios.get(
        `https://api.twitter.com/2/users/by/username/${cleanUsername}`,
        {
          headers: { Authorization: `Bearer ${bearerToken}` },
          timeout: 8000,
        }
      );

      return {
        accessible: response.status === 200,
      };
    } catch (error: any) {
      return {
        accessible: false,
        error: error.response?.data?.title || 'User not found or no access',
      };
    }
  }
}
