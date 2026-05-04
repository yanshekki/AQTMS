// ── useWebSocket Hook ──
// Socket.io client with auto-reconnect, heartbeat, Zod-validated messages, topic subscription.
// Backend uses socket.io; token is sent via auth handshake, NOT query params.

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ZodSchema } from 'zod';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface UseWebSocketOptions {
  url: string;
  token: string | null;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const { url, token } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const listeners = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());
  const subscribedTopics = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (!token) return;

    // Disconnect existing socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
    }

    setStatus('connecting');

    const socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');

      // Re-subscribe to previously subscribed topics
      subscribedTopics.current.forEach((topic) => {
        socket.emit(`subscribe:${topic}`);
      });
    });

    socket.on('disconnect', (reason) => {
      if (socket.active) {
        setStatus('reconnecting');
      } else {
        setStatus('disconnected');
      }
      console.warn(`WebSocket disconnected: ${reason}`);
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message);
      if (socket.active) {
        setStatus('reconnecting');
      } else {
        setStatus('disconnected');
      }
    });

    // Generic message handler — routes by event name
    socket.onAny((eventName: string, ...args: unknown[]) => {
      const handlers = listeners.current.get(eventName);
      if (handlers && args.length > 0) {
        handlers.forEach((handler) => handler(args[0]));
      }
    });
  }, [url, token]);

  const disconnect = useCallback(() => {
    subscribedTopics.current.clear();
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const subscribe = useCallback(
    <T>(topic: string, handler: (data: T) => void, schema?: ZodSchema<T>) => {
      const wrappedHandler = (raw: unknown) => {
        if (schema) {
          const result = schema.safeParse(raw);
          if (!result.success) {
            console.warn(`WebSocket message validation failed for topic "${topic}":`, result.error.issues);
            return;
          }
          handler(result.data);
        } else {
          handler(raw as T);
        }
      };

      if (!listeners.current.has(topic)) {
        listeners.current.set(topic, new Set());
      }
      listeners.current.get(topic)!.add(wrappedHandler as (data: unknown) => void);

      // Return unsubscribe function
      return () => {
        listeners.current.get(topic)?.delete(wrappedHandler as (data: unknown) => void);
        if (listeners.current.get(topic)?.size === 0) {
          listeners.current.delete(topic);
        }
      };
    },
    [],
  );

  // Join a server-side room (e.g. 'risk', 'signals', or 'exchange:binance')
  const joinRoom = useCallback((room: string) => {
    subscribedTopics.current.add(room);
    if (socketRef.current?.connected) {
      socketRef.current.emit(`subscribe:${room}`);
    }
    // Return leave function
    return () => {
      subscribedTopics.current.delete(room);
    };
  }, []);

  const send = useCallback((data: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message', data);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { status, subscribe, joinRoom, send, disconnect, reconnect: connect };
}
