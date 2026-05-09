import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/validation.schema';

// ... other imports ...

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    RiskModule,
    ExecutionModule,
    // ... other modules ...
  ],
  // ...
})
export class AppModule {}
