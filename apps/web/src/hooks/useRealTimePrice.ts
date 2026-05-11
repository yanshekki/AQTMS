import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

let globalSocket: Socket | null = null;

const getSocket = () => {
  if (!globalSocket) {
    globalSocket = io('http://localhost:3000/trading', {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    globalSocket.on('connect', () => {
      globalSocket?.emit('auth', { userId: 'demo-user' });
    });

    globalSocket.on('disconnect', () => {
      console.warn('WebSocket disconnected');
    });

    globalSocket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
    });
  }
  return globalSocket;
};

export function useRealTimePrice(symbols: string[] = []) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const s = getSocket();
    socketRef.current = s;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const onPriceUpdate = (data: PriceUpdate) => {
      if (symbols.length === 0 || symbols.includes(data.symbol)) {
        setPrices((prev) => ({
          ...prev,
          [data.symbol]: data.price,
        }));
      }
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('price:update', onPriceUpdate);

    // Initial connection status
    if (s.connected) {
      setIsConnected(true);
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('price:update', onPriceUpdate);
    };
  }, [symbols]);

  return { prices, isConnected };
}
