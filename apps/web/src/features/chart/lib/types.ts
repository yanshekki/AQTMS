// ── Chart Types ──

export interface ChartMarker {
  time: number; // Unix timestamp in seconds (Lightweight Charts format)
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle';
  text: string;
  size?: number;
}

export interface ChartCandle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export type TimeFrame = '1m' | '5m' | '15m' | '1H' | '4H' | '1D';

export interface ChartConfig {
  symbol: string;
  timeframe: TimeFrame;
  height?: number;
  showVolume?: boolean;
  markers?: ChartMarker[];
  from?: number; // timestamp
  to?: number;
}
