export interface BinanceExecutionReport {
  e: 'executionReport';
  E: number;
  s: string;
  c: string;
  S: 'BUY' | 'SELL';
  o: string;
  f: string;
  q: string;
  p: string;
  P: string;
  F: string;
  g: number;
  C: string;
  x: string;
  X: string;
  r: string;
  i: number;
  l: string;
  z: string;
  L: string;
  n: string;
  N: string | null;
  T: number;
  t: number;
  I: number;
  w: boolean;
  m: boolean;
  M: boolean;
  O: number;
  Z: string;
  Y: string;
  Q: string;
}

export interface BinanceOutboundAccountPosition {
  e: 'outboundAccountPosition';
  E: number;                    // Event Time
  u: number;                    // Time of last account update
  B: BinanceBalance[];
}

export interface BinanceBalance {
  a: string;                    // Asset
  f: string;                    // Free
  l: string;                    // Locked
}

export interface BinanceBalanceUpdate {
  e: 'balanceUpdate';
  E: number;
  a: string;                    // Asset
  d: string;                    // Balance Delta
  T: number;                    // Clear Time
}

export type BinanceWebSocketEvent =
  | BinanceExecutionReport
  | BinanceOutboundAccountPosition
  | BinanceBalanceUpdate;
