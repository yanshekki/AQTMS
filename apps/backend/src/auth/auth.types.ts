export interface AuthenticatedUser {
  id: string;
  userId: string;           // alias for backward compatibility
  walletAddress: string;
  role: string;
  permissions: string[];
}
