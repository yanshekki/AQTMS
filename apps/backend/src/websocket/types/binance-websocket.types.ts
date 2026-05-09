export interface BinanceExecutionReport {
  e: 'executionReport';           // Event type
  E: number;                      // Event time
  s: string;                      // Symbol
  c: string;                      // Client order ID
  S: 'BUY' | 'SELL';              // Side
  o: string;                      // Order type
  f: string;                      // Time in force
  q: string;                      // Order quantity
  p: string;                      // Order price
  P: string;                      // Stop price
  F: string;                      // Iceberg quantity
  g: number;                      // Order list ID
  C: string;                      // Original client order ID
  x: string;                      // Execution type (NEW, CANCELED, REJECTED, TRADE, etc.)
  X: string;                      // Order status
  r: string;                      // Order reject reason
  i: number;                      // Order ID
  l: string;                      // Last executed quantity
  z: string;                      // Cumulative filled quantity
  L: string;                      // Last executed price
  n: string;                      // Commission amount
  N: string | null;               // Commission asset
  T: number;                      // Transaction time
  t: number;                      // Trade ID
  I: number;                      // Ignore
  w: boolean;                     // Is the order on the book?
  m: boolean;                     // Is this trade the maker side?
  M: boolean;                     // Ignore
  O: number;                      // Order creation time
  Z: string;                      // Cumulative quote asset transacted quantity
  Y: string;                      // Last quote asset transacted quantity
  Q: string;                      // Quote order quantity
}
