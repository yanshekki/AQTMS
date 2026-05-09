import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { StructuredLoggerService } from './common/logger/logger.service';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new StructuredLoggerService();

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  // Security headers
  app.use(helmet());

  // 全域 Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable graceful shutdown hooks
  app.enableShutdownHooks();

  await app.listen(process.env.PORT || 3000);
  logger.log(`Application is running on port ${process.env.PORT || 3000}`);
}

bootstrap();
