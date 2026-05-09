import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { StructuredLoggerService } from './common/logger/logger.service';
import helmet from 'helmet';

// Sentry
import * as Sentry from '@sentry/nestjs';

async function bootstrap() {
  // Initialize Sentry
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
  }

  const logger = new StructuredLoggerService();

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  app.use(helmet());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen(process.env.PORT || 3000);
  logger.log(`Application is running on port ${process.env.PORT || 3000}`);
}

bootstrap();
