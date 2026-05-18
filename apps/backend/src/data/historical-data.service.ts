import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Candle } from '../backtest/interfaces/strategy.interface';

@Injectable()
export class HistoricalDataService {
  private readonly logger = new Logger(HistoricalDataService.name);
  /**
   * 從 Binance 獲取 K 線數據
   */
  async getBinanceKlines(
    symbol: string,
    interval: string = '1h',
    startTime?: number,
    endTime?: number,
    limit: number = 1000,
  ): Promise<Candle[]> {
    try {
      const params: any = {
        symbol: symbol.toUpperCase(),
        interval,
        limit,
      };

      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;

      const response = await axios.get('https://api.binance.com/api/v3/klines', { params });

      return response.data.map((k: any[]) => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch Binance klines for ${symbol}`, (error as Error).stack);
      throw error;
    }
  }

  /**
   * 從 Bybit 獲取 K 線數據（簡單實作）
   */
  async getBybitKlines(
    symbol: string,
    interval: string = '60',
    startTime?: number,
    endTime?: number,
    limit: number = 200,
  ): Promise<Candle[]> {
    // TODO: 實作 Bybit 的 kline 獲取
    console.warn('[HistoricalDataService] Bybit historical data not implemented yet');
    return [];
  }

  /**
   * 通用方法：根據交易所獲取數據
   */
  async getHistoricalData(
    exchange: 'BINANCE' | 'BYBIT',
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number,
  ): Promise<Candle[]> {
    if (exchange === 'BINANCE') {
      return this.getBinanceKlines(symbol, interval, startTime, endTime);
    } else if (exchange === 'BYBIT') {
      return this.getBybitKlines(symbol, interval, startTime, endTime);
    }
    throw new Error(`Unsupported exchange: ${exchange}`);
  }
}
