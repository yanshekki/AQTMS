// ── Uniswap V3 DEX Adapter ──
// Supports Ethereum, Arbitrum, Base, Optimism, Polygon.

import { ethers } from 'ethers';
import { BaseDEXAdapter, type QuoteParams, type QuoteResult, type SwapParams, type SwapResult, type LiquidityParams, type LiquidityResult, type LPPosition } from './BaseDEXAdapter';
import { InfraError } from '../../../shared/errors';

const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const UNISWAP_V3_QUOTER = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';

const CHAIN_CONFIG: Record<string, { rpc: string }> = {
  ethereum: { rpc: 'https://eth.llamarpc.com' },
  arbitrum: { rpc: 'https://arb1.arbitrum.io/rpc' },
  base: { rpc: 'https://mainnet.base.org' },
  optimism: { rpc: 'https://mainnet.optimism.io' },
  polygon: { rpc: 'https://polygon-rpc.com' },
};

export interface UniswapV3Config {
  chain: string;
  privateKey: string;
  rpcUrl?: string;
}

export class UniswapV3Adapter extends BaseDEXAdapter {
  public readonly dexName = 'UNISWAP_V3';
  public readonly chain: string;
  private readonly provider: ethers.JsonRpcProvider;
  private readonly wallet: ethers.Wallet;
  private readonly deadlineMinutes = 20;

  constructor(config: UniswapV3Config) {
    super();
    this.chain = config.chain;
    const chainCfg = CHAIN_CONFIG[config.chain] ?? CHAIN_CONFIG.ethereum!;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl ?? chainCfg.rpc);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
  }

  async getQuote(params: QuoteParams): Promise<QuoteResult> {
    try {
      const quoter = new ethers.Contract(UNISWAP_V3_QUOTER, [
        'function quoteExactInputSingle(address,address,uint24,uint256,uint160) view returns (uint256)',
      ], this.provider);

      const amountOut = await (quoter.getFunction('quoteExactInputSingle') as (a: string, b: string, c: number, d: bigint, e: bigint) => Promise<bigint>)(
        params.tokenIn, params.tokenOut, 3000, BigInt(params.amountIn), 0n,
      );

      const gasPrice = (await this.provider.getFeeData()).gasPrice ?? 0n;

      return {
        amountOut: amountOut.toString(),
        priceImpact: 0,
        route: [params.tokenIn, params.tokenOut],
        dexName: this.dexName,
        gasEstimate: ethers.formatEther(gasPrice * 200000n),
        effectivePrice: 0,
      };
    } catch (error) {
      throw new InfraError(`Uniswap quote failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'UNISWAP_QUOTE_FAILED');
    }
  }

  async executeSwap(params: SwapParams): Promise<SwapResult> {
    try {
      const deadline = Math.floor(Date.now() / 1000) + this.deadlineMinutes * 60;
      const iface = new ethers.Interface([
        'function exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160)) external payable returns (uint256)',
      ]);

      const data = iface.encodeFunctionData('exactInputSingle', [{
        tokenIn: params.tokenIn, tokenOut: params.tokenOut, fee: 3000,
        recipient: params.recipient, deadline, amountIn: params.amountIn,
        amountOutMinimum: params.minAmountOut, sqrtPriceLimitX96: 0,
      }]);

      const tx = { to: UNISWAP_V3_ROUTER, data };
      const response = await this.wallet.sendTransaction(tx);
      const receipt = await response.wait();

      return {
        txHash: receipt?.hash ?? '',
        amountIn: params.amountIn, amountOut: params.minAmountOut,
        gasUsed: receipt?.gasUsed.toString() ?? '0',
        effectivePrice: 0, slippage: 0,
      };
    } catch (error) {
      throw new InfraError(`Uniswap swap failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'UNISWAP_SWAP_FAILED');
    }
  }

  async addLiquidity(_params: LiquidityParams): Promise<LiquidityResult> {
    throw new InfraError('Uniswap V3 addLiquidity — requires NFT position manager', 'NOT_IMPLEMENTED');
  }

  async removeLiquidity(_pid: string, _r: string): Promise<LiquidityResult> {
    throw new InfraError('Uniswap V3 removeLiquidity — requires NFT position manager', 'NOT_IMPLEMENTED');
  }

  async getPositions(_walletAddress: string): Promise<LPPosition[]> { return []; }

  async getPoolInfo(_ta: string, _tb: string): Promise<{ tvl: string; volume24h: string; feeTier?: number }> {
    return { tvl: '0', volume24h: '0', feeTier: 3000 };
  }

  async testConnection(): Promise<boolean> {
    try { await this.provider.getBlockNumber(); return true; } catch (error) { this.logger?.warn?.(`Uniswap testConnection failed: ${error instanceof Error ? error.message : error}`); return false; }
  }
}
