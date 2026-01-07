import { Global, Module } from '@nestjs/common';
import { OtelLoggerService } from './otel-logger.service';

export const OTEL_LOGGER = 'OTEL_LOGGER';

@Global()
@Module({
  providers: [
    OtelLoggerService,
    {
      provide: OTEL_LOGGER,
      useClass: OtelLoggerService,
    },
  ],
  exports: [OtelLoggerService, OTEL_LOGGER],
})
export class OtelLoggerModule {}
