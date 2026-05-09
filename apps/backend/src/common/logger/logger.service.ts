import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

@Injectable()
export class StructuredLoggerService implements NestLoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    this.printLog('log', message, context);
  }

  error(message: any, trace?: string, context?: string) {
    this.printLog('error', message, context, trace);
  }

  warn(message: any, context?: string) {
    this.printLog('warn', message, context);
  }

  debug(message: any, context?: string) {
    this.printLog('debug', message, context);
  }

  verbose(message: any, context?: string) {
    this.printLog('verbose', message, context);
  }

  private printLog(level: string, message: any, context?: string, trace?: string) {
    const logObject = {
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === 'object' ? message : { msg: message },
      context: context || this.context || 'App',
      ...(trace && { trace }),
    };

    console.log(JSON.stringify(logObject));
  }
}
