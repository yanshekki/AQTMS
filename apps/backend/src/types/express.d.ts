declare namespace Express {
  interface Request {
    user?: {
      id: string;
      userId: string;
      walletAddress: string;
      role: string;
      permissions: string[];
    };
  }
}
