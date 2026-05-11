import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

let socket: Socket | null = null;

const getSocket = () => {
  if (!socket) {
    socket = io('http://localhost:3000/trading', {
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      socket?.emit('auth', { userId: 'demo-user' });
    });
  }
  return socket;
};

export function useRealTimePrice(symbols: string[] = []) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();

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

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('price:update', onPriceUpdate);
    };
  }, [symbols]);

  return { prices, isConnected };
}
