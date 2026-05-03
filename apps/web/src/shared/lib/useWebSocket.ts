// ── useWebSocket Hook ──
// Auto-reconnect, heartbeat, Zod-validated messages, topic subscription.

import { useEffect, useRef, useCallback, useState } from 'react';
import type { ZodSchema } from 'zod';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface UseWebSocketOptions {
  url: string;
  token: string | null;
  heartbeatIntervalMs?: number;
  reconnectDelayMs?: number;
  maxReconnectAttempts?: number;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    token,
    heartbeatIntervalMs = 30_000,
    reconnectDelayMs = 2_000,
    maxReconnectAttempts = 10,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval>>();
  const listeners = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  const connect = useCallback(() => {
    if (!token) return;

    setStatus('connecting');
    const ws = new WebSocket(`${url}?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      reconnectCount.current = 0;

      // Start heartbeat
      heartbeatTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, heartbeatIntervalMs);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string);
        const topic = message.type ?? 'default';
        const handlers = listeners.current.get(topic);
        if (handlers) {
          handlers.forEach((handler) => handler(message));
        }
      } catch {
        console.warn('Failed to parse WebSocket message');
      }
    };

    ws.onclose = () => {
      clearInterval(heartbeatTimer.current);
      if (reconnectCount.current < maxReconnectAttempts) {
        setStatus('reconnecting');
        reconnectCount.current++;
        setTimeout(connect, reconnectDelayMs * Math.min(reconnectCount.current, 5));
      } else {
        setStatus('disconnected');
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url, token, heartbeatIntervalMs, reconnectDelayMs, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    reconnectCount.current = maxReconnectAttempts; // Prevent reconnection
    clearInterval(heartbeatTimer.current);
    wsRef.current?.close();
    setStatus('disconnected');
  }, [maxReconnectAttempts]);

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

      // Send subscribe message if connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'subscribe', topic }));
      }

      // Return unsubscribe function
      return () => {
        listeners.current.get(topic)?.delete(wrappedHandler as (data: unknown) => void);
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'unsubscribe', topic }));
        }
      };
    },
    [],
  );

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return { status, subscribe, send, disconnect, reconnect: connect };
}
