import { Injectable } from '@nestjs/common';
import WebSocket from 'ws';
import axios from 'axios';
import { IExchangeWebsocket } from '../interfaces/exchange-websocket.interface';

@Injectable()
export class BinanceWebsocketClient implements IExchangeWebsocket {
  private ws: WebSocket | null = null;
  private userDataWs: WebSocket | null = null;
  private messageCallback?: (data: any) => void;
  private errorCallback?: (error: Error) => void;
  private closeCallback?: () => void;

  private listenKey: string | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;

  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.BINANCE_TESTNET === 'true'
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com';
    this.apiKey = process.env.BINANCE_API_KEY || '';
  }

  // ... existing connect, disconnect, subscribePublic methods ...

  /**
   * 取得 User Data Stream 的 listenKey
   */
  async getListenKey(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v3/userDataStream`,
        null,
        {
          headers: {
            'X-MBX-APIKEY': this.apiKey,
          },
        },
      );

      this.listenKey = response.data.listenKey;
      console.log('[BinanceWebsocket] ListenKey obtained');
      return this.listenKey;
    } catch (error: any) {
      console.error('[BinanceWebsocket] Failed to get listenKey:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 保持 listenKey 活躍（每 30 分鐘呼叫一次）
   */
  startKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    this.keepAliveInterval = setInterval(async () => {
      if (this.listenKey) {
        try {
          await axios.put(
            `${this.baseUrl}/api/v3/userDataStream?listenKey=${this.listenKey}`,
            null,
            {
              headers: {
                'X-MBX-APIKEY': this.apiKey,
              },
            },
          );
          console.log('[BinanceWebsocket] ListenKey keep-alive sent');
        } catch (error) {
          console.error('[BinanceWebsocket] Keep-alive failed:', error);
        }
      }
    }, 30 * 60 * 1000); // 每 30 分鐘
  }

  /**
   * 連線到用戶數據流
   */
  async connectUserStream(): Promise<void> {
    if (!this.listenKey) {
      await this.getListenKey();
    }

    const userStreamUrl = `${this.baseUrl.replace('https', 'wss').replace('/api', '')}/ws/${this.listenKey}`;

    this.userDataWs = new WebSocket(userStreamUrl);

    this.userDataWs.on('open', () => {
      console.log('[BinanceWebsocket] User Data Stream connected');
      this.startKeepAlive();
    });

    this.userDataWs.on('message', (data: string) => {
      if (this.messageCallback) {
        try {
          const parsed = JSON.parse(data);
          this.messageCallback(parsed);
        } catch (e) {
          console.error('[BinanceWebsocket] Failed to parse user data message');
        }
      }
    });

    this.userDataWs.on('error', (error) => {
      console.error('[BinanceWebsocket] User Data Stream error:', error);
      if (this.errorCallback) this.errorCallback(error);
    });

    this.userDataWs.on('close', () => {
      console.log('[BinanceWebsocket] User Data Stream closed');
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
      }
      if (this.closeCallback) this.closeCallback();
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.userDataWs) {
      this.userDataWs.close();
      this.userDataWs = null;
    }
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
  }

  // ... other methods ...
}
