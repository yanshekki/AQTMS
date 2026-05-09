export interface IExchangeWebsocket {
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;

  /**
   * 訂閱公共頻道（例如 trade, depth, ticker）
   */
  subscribePublic(stream: string): void;

  /**
   * 訂閱用戶私有頻道（需要 listenKey）
   */
  subscribeUser(listenKey: string): void;

  onMessage(callback: (data: any) => void): void;
  onError(callback: (error: Error) => void): void;
  onClose(callback: () => void): void;
}
