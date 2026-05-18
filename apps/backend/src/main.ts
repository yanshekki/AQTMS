import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import helmet from 'helmet';

// OpenTelemetry (enable in production for full tracing)
// import { NodeSDK } from '@opentelemetry/sdk-node';
// import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

async function bootstrap() {
  // Optional: Initialize OpenTelemetry before creating the app
  // const sdk = new NodeSDK({
  //   traceExporter: new OTLPTraceExporter(),
  //   instrumentations: [getNodeAutoInstrumentations()],
  // });
  // await sdk.start();

  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3001;
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`🚀 AQTMS Backend running on: http://localhost:${port}/api/v1`);
}
bootstrap();
