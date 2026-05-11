export interface AuthenticatedUser {
  id: string;
  userId: string;           // alias for backward compatibility with existing code
  walletAddress: string;
  role: string;
  permissions: string[];
}
