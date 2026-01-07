import './tracing';

import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { OtelLoggerService } from './common/logger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: true,
      credentials: true,
    },
    bufferLogs: true,
  });

  // Use custom OpenTelemetry-integrated logger
  const otelLogger = app.get(OtelLoggerService);
  otelLogger.setContext('NestApplication');
  app.useLogger(otelLogger);

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost, otelLogger));

  app.use(helmet());
  app.use(cookieParser());

  app.use(
    csurf({
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      },
    }),
  );

  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  await app.listen(configService.get('PORT') ?? 3001, '0.0.0.0');
}
bootstrap();
