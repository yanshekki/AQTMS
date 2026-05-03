// ── Base DEX Adapter ──
// Abstract interface for decentralized exchange operations.
// Different from BaseTradingAdapter because DEX operations are fundamentally different:
// - No centralized order book (AMM pools)
// - Gas fees + MEV protection required
// - Slippage tolerance management
// - Liquidity pool interactions


export interface QuoteParams {
  tokenIn: string;        // Input token address
  tokenOut: string;       // Output token address
  amountIn: string;       // In wei/base units
  slippagePercent: number; // e.g., 0.5 = 0.5%
}

export interface QuoteResult {
  amountOut: string;
  priceImpact: number;
  route: string[];
  dexName: string;
  gasEstimate: string;
  effectivePrice: number;
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;   // Slippage-protected minimum
  recipient: string;
  deadlineMinutes?: number;
}

export interface SwapResult {
  txHash: string;
  amountIn: string;
  amountOut: string;
  gasUsed: string;
  effectivePrice: number;
  slippage: number;       // Actual slippage %
}

export interface LiquidityParams {
  tokenA: string;
  tokenB: string;
  amountA: string;
  amountB: string;
  feeTier?: number;       // Uniswap V3: 500, 3000, 10000
  slippagePercent: number;
}

export interface LiquidityResult {
  txHash: string;
  tokenId?: string;       // NFT position ID (Uniswap V3)
  liquidity: string;
  amountA: string;
  amountB: string;
}

export interface LPPosition {
  tokenId: string;
  pool: string;
  tokenA: string;
  tokenB: string;
  liquidity: string;
  unclaimedFees: string[];
}

export abstract class BaseDEXAdapter {
  public abstract readonly dexName: string;
  public abstract readonly chain: string;

  // ── Swap Operations ──
  abstract getQuote(params: QuoteParams): Promise<QuoteResult>;
  abstract executeSwap(params: SwapParams): Promise<SwapResult>;

  // ── Liquidity Operations ──
  abstract addLiquidity(params: LiquidityParams): Promise<LiquidityResult>;
  abstract removeLiquidity(positionId: string, recipient: string): Promise<LiquidityResult>;
  abstract getPositions(walletAddress: string): Promise<LPPosition[]>;

  // ── Info ──
  abstract getPoolInfo(tokenA: string, tokenB: string): Promise<{
    tvl: string;
    volume24h: string;
    feeTier?: number;
  }>;

  // ── Connectivity ──
  abstract testConnection(): Promise<boolean>;

  // ── Error handling ──
  protected handleError(error: unknown, operation: string): never {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`[${this.dexName}] ${operation} failed: ${message}`);
  }
}
