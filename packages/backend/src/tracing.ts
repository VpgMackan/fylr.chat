import 'dotenv/config';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from '@opentelemetry/sdk-logs';
import { logs } from '@opentelemetry/api-logs';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { credentials } from '@grpc/grpc-js';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const otelEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317';

const grpcCredentials = credentials.createInsecure();

const logExporter = new OTLPLogExporter({
  url: otelEndpoint,
  credentials: grpcCredentials,
});
const logRecordProcessor = new BatchLogRecordProcessor(logExporter);
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'backend-service',
});

const loggerProvider = new LoggerProvider({
  resource,
  processors: [logRecordProcessor],
});
logs.setGlobalLoggerProvider(loggerProvider);

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: otelEndpoint,
    credentials: grpcCredentials,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: otelEndpoint,
      credentials: grpcCredentials,
    }),
  }),
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({
      url: otelEndpoint,
      credentials: grpcCredentials,
    }),
  ),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-nestjs-core': {},
      '@opentelemetry/instrumentation-express': {},
      '@opentelemetry/instrumentation-http': {},
      '@opentelemetry/instrumentation-amqplib': {},
    }),
    new PrismaInstrumentation(),
  ],
  resource,
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().then(() => console.log('Tracing terminated.'));
});
