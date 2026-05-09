import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { validationSchema } from './config/validation.schema';

// ... other imports ...

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,   // 60 seconds
          limit: 30,    // 30 requests per 60 seconds (default)
        },
      ],
    }),
    // ... other modules (RiskModule, ExecutionModule, etc.) ...
  ],
  // ...
})
export class AppModule {}
