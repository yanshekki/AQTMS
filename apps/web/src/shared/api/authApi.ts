// ── Auth API Client ──

import { axiosInstance } from '@/shared/api';

interface ChallengeResponse {
  success: true;
  data: { message: string };
  timestamp: string;
}

interface AuthenticateResponse {
  success: true;
  data: {
    token: string;
    user: {
      id: string;
      walletAddress: string;
      role: string;
      permissions: string[];
    };
  };
  timestamp: string;
}

export async function requestChallenge(walletAddress: string): Promise<string> {
  const response = await axiosInstance.post<ChallengeResponse>('/auth/challenge', {
    walletAddress,
  });
  return response.data.data.message;
}

export async function authenticate(walletAddress: string, signature: string): Promise<AuthenticateResponse['data']> {
  const response = await axiosInstance.post<AuthenticateResponse>('/auth/authenticate', {
    walletAddress,
    signature,
  });
  return response.data.data;
}
