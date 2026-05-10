import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello from AQTMS Backend! Monorepo + NestJS skeleton ready.';
  }
}