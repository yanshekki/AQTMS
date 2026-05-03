// ── Chart Datafeed (Binance public API) ──

import type { ChartCandle, TimeFrame } from './types';

export class ChartDatafeed {
  private binanceBase = 'https://api.binance.com';

  async fetchKlines(symbol: string, interval: string, limit = 500): Promise<ChartCandle[]> {
    const url = `${this.binanceBase}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    const data = (await res.json()) as Array<unknown>;
    return (data as Array<Array<string | number>>).map((row) => ({
      time: Math.floor((row[0] as number) / 1000), // Convert ms to seconds
      open: parseFloat(String(row[1])),
      high: parseFloat(String(row[2])),
      low: parseFloat(String(row[3])),
      close: parseFloat(String(row[4])),
      volume: parseFloat(String(row[5])),
    }));
  }

  static timeframeToInterval(tf: TimeFrame): string {
    const map: Record<TimeFrame, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1H': '1h',
      '4H': '4h',
      '1D': '1d',
    };
    return map[tf];
  }
}
