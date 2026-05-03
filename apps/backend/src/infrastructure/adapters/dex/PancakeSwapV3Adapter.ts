// ── PancakeSwap V3 DEX Adapter ──

import { ethers } from 'ethers';
import { BaseDEXAdapter, type QuoteParams, type QuoteResult, type SwapParams, type SwapResult, type LiquidityParams, type LiquidityResult, type LPPosition } from './BaseDEXAdapter';
import { InfraError } from '../../../shared/errors';

const PANCAKESWAP_V3_QUOTER = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997';
const PANCAKESWAP_V3_ROUTER = '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4';
const BSC_RPC = 'https://bsc-dataseed.binance.org';

export interface PancakeSwapV3Config {
  privateKey: string;
  rpcUrl?: string;
}

export class PancakeSwapV3Adapter extends BaseDEXAdapter {
  public readonly dexName = 'PANCAKESWAP_V3';
  public readonly chain = 'BSC';
  private readonly provider: ethers.JsonRpcProvider;
  private readonly wallet: ethers.Wallet;
  private readonly deadlineMinutes = 20;

  constructor(config: PancakeSwapV3Config) {
    super();
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl ?? BSC_RPC);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
  }

  async getQuote(params: QuoteParams): Promise<QuoteResult> {
    try {
      const quoter = new ethers.Contract(PANCAKESWAP_V3_QUOTER, [
        'function quoteExactInputSingle(address,address,uint24,uint256,uint160) view returns (uint256)',
      ], this.provider);
      const amountOut = await (quoter.getFunction('quoteExactInputSingle') as (a: string, b: string, c: number, d: bigint, e: bigint) => Promise<bigint>)(
        params.tokenIn, params.tokenOut, 2500, BigInt(params.amountIn), 0n,
      );
      const gasPrice = (await this.provider.getFeeData()).gasPrice ?? 0n;
      return {
        amountOut: amountOut.toString(), priceImpact: 0,
        route: [params.tokenIn, params.tokenOut], dexName: this.dexName,
        gasEstimate: ethers.formatEther(gasPrice * 200000n), effectivePrice: 0,
      };
    } catch (error) {
      throw new InfraError(`PancakeSwap quote failed: ${error instanceof Error ? error.message : 'Unknown'}`, 'PANCAKESWAP_QUOTE_FAILED');
    }
  }

  async executeSwap(params: SwapParams): Promise<SwapResult> {
    const deadline = Math.floor(Date.now() / 1000) + this.deadlineMinutes * 60;
    const iface = new ethers.Interface(['function exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160)) external payable returns (uint256)']);
    const data = iface.encodeFunctionData('exactInputSingle', [{ tokenIn: params.tokenIn, tokenOut: params.tokenOut, fee: 2500, recipient: params.recipient, deadline, amountIn: params.amountIn, amountOutMinimum: params.minAmountOut, sqrtPriceLimitX96: 0 }]);
    const response = await this.wallet.sendTransaction({ to: PANCAKESWAP_V3_ROUTER, data });
    const receipt = await response.wait();
    return { txHash: receipt?.hash ?? '', amountIn: params.amountIn, amountOut: params.minAmountOut, gasUsed: receipt?.gasUsed.toString() ?? '0', effectivePrice: 0, slippage: 0 };
  }

  async addLiquidity(_p: LiquidityParams): Promise<LiquidityResult> { throw new InfraError('Not implemented', 'NOT_IMPLEMENTED'); }
  async removeLiquidity(_pid: string, _r: string): Promise<LiquidityResult> { throw new InfraError('Not implemented', 'NOT_IMPLEMENTED'); }
  async getPositions(_w: string): Promise<LPPosition[]> { return []; }
  async getPoolInfo(_ta: string, _tb: string): Promise<{ tvl: string; volume24h: string; feeTier?: number }> { return { tvl: '0', volume24h: '0', feeTier: 2500 }; }
  async testConnection(): Promise<boolean> { try { await this.provider.getBlockNumber(); return true; } catch { return false; } }
}
