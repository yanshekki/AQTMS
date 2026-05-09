import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全域 Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Enable graceful shutdown hooks (important for Docker/K8s)
  app.enableShutdownHooks();

  await app.listen(process.env.PORT || 3000);
  console.log(`Application is running on port ${process.env.PORT || 3000}`);
}

bootstrap();
