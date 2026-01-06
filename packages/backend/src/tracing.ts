import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PrismaInstrumentation } from '@prisma/instrumentation';

const otelEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: `${otelEndpoint}/v1/traces`,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${otelEndpoint}/v1/metrics`,
    }),
  }),
  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({
      url: `${otelEndpoint}/v1/logs`,
    }),
  ),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Auto-instrument common libraries
      '@opentelemetry/instrumentation-nestjs-core': {},
      '@opentelemetry/instrumentation-express': {},
      '@opentelemetry/instrumentation-http': {},
      '@opentelemetry/instrumentation-amqplib': {},
    }),
    new PrismaInstrumentation(),
  ],
  serviceName: 'backend-service',
});

sdk.start();

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  sdk.shutdown().then(() => console.log('Tracing terminated.'));
});
