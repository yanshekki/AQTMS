declare module 'socket.io' {
  import type { Server as HttpServer } from 'node:http';

  export interface Socket {
    id: string;
    handshake: { auth?: Record<string, unknown> };
    join(room: string): void;
    on(event: string, callback: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
    disconnect(close?: boolean): void;
  }

  export class Server {
    constructor(server: HttpServer, options?: any);
    use(fn: (socket: Socket, next: (err?: Error) => void) => void): void;
    on(event: string, callback: (socket: Socket) => void): void;
    to(room: string): { emit: (event: string, ...args: any[]) => void };
    emit(event: string, ...args: any[]): void;
    adapter(adapter: any): void;
  }
}
