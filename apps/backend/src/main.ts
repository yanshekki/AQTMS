import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { StructuredLoggerService } from './common/logger/logger.service';
import helmet from 'helmet';
import { metricsMiddleware } from './common/middleware/metrics.middleware';
import * as promClient from 'prom-client';

// Sentry
import * as Sentry from '@sentry/nestjs';

async function bootstrap() {
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
  app.use(metricsMiddleware);

  // Expose /metrics endpoint for Prometheus
  app.getHttpAdapter().get('/metrics', async (req, res) => {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  await app.listen(process.env.PORT || 3000);
  logger.log(`Application is running on port ${process.env.PORT || 3000}`);
}

bootstrap();
