import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validationSchema } from './config/validation.schema';

// Conditional debug module (only in development)
const debugModules = process.env.NODE_ENV === 'production' 
  ? [] 
  : [import('./debug/debug.module').then(m => m.DebugModule)];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 30,
        },
      ],
    }),
    // ... other modules
    ...(debugModules.length > 0 ? debugModules : []),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // ... other providers
  ],
  // ...
})
export class AppModule {}
