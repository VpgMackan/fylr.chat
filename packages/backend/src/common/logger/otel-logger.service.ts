import { LoggerService, Injectable } from '@nestjs/common';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { trace, context } from '@opentelemetry/api';

/**
 * Custom NestJS Logger Service that integrates with OpenTelemetry.
 * This ensures all logs are correlated with traces by injecting
 * trace_id and span_id into log records.
 */
@Injectable()
export class OtelLoggerService implements LoggerService {
  private loggerName = 'NestJS';
  private readonly otelLogger = logs.getLogger('nestjs-logger');

  setContext(context: string) {
    this.loggerName = context;
  }

  log(message: any, ...optionalParams: any[]) {
    this.emitLog(SeverityNumber.INFO, 'INFO', message, optionalParams);
  }

  error(message: any, ...optionalParams: any[]) {
    this.emitLog(SeverityNumber.ERROR, 'ERROR', message, optionalParams);
  }

  warn(message: any, ...optionalParams: any[]) {
    this.emitLog(SeverityNumber.WARN, 'WARN', message, optionalParams);
  }

  debug?(message: any, ...optionalParams: any[]) {
    this.emitLog(SeverityNumber.DEBUG, 'DEBUG', message, optionalParams);
  }

  verbose?(message: any, ...optionalParams: any[]) {
    this.emitLog(SeverityNumber.TRACE, 'VERBOSE', message, optionalParams);
  }

  fatal?(message: any, ...optionalParams: any[]) {
    this.emitLog(SeverityNumber.FATAL, 'FATAL', message, optionalParams);
  }

  private emitLog(
    severityNumber: SeverityNumber,
    severityText: string,
    message: any,
    optionalParams: any[],
  ) {
    // Extract context name if provided as last parameter (NestJS convention)
    let contextName = this.loggerName;
    let stack: string | undefined;
    const attributes: Record<string, any> = {};

    // NestJS Logger conventions:
    // error(message, stack, context)
    // log/warn/debug/verbose(message, context)
    if (optionalParams.length > 0) {
      const lastParam = optionalParams[optionalParams.length - 1];
      if (typeof lastParam === 'string' && !lastParam.includes('\n')) {
        contextName = lastParam;
        optionalParams = optionalParams.slice(0, -1);
      }
    }

    // For error logs, the second param might be a stack trace
    if (severityNumber >= SeverityNumber.ERROR && optionalParams.length > 0) {
      const possibleStack = optionalParams[0];
      if (typeof possibleStack === 'string' && possibleStack.includes('\n')) {
        stack = possibleStack;
        attributes['exception.stacktrace'] = stack;
      } else if (possibleStack instanceof Error) {
        stack = possibleStack.stack;
        attributes['exception.type'] = possibleStack.name;
        attributes['exception.message'] = possibleStack.message;
        if (stack) {
          attributes['exception.stacktrace'] = stack;
        }
      }
    }

    // Get current trace context for correlation
    const currentContext = context.active();
    const span = trace.getSpan(currentContext);
    const spanContext = span?.spanContext();

    if (spanContext) {
      attributes['trace_id'] = spanContext.traceId;
      attributes['span_id'] = spanContext.spanId;
      attributes['trace_flags'] = spanContext.traceFlags;
    }

    attributes['logger.name'] = contextName;
    attributes['service.name'] = 'backend-service';

    // Format message for console output with trace correlation
    const timestamp = new Date().toISOString();
    const traceInfo = spanContext
      ? ` [trace_id=${spanContext.traceId.slice(0, 8)}...]`
      : '';

    // Emit to OpenTelemetry
    this.otelLogger.emit({
      severityNumber,
      severityText,
      body: typeof message === 'string' ? message : JSON.stringify(message),
      attributes,
      context: currentContext,
    });

    // Also log to console for local development visibility
    const formattedMessage = `[${timestamp}] [${severityText}] [${contextName}]${traceInfo} ${message}`;

    switch (severityNumber) {
      case SeverityNumber.ERROR:
      case SeverityNumber.FATAL:
        if (stack) {
          console.error(formattedMessage, '\n', stack);
        } else {
          console.error(formattedMessage);
        }
        break;
      case SeverityNumber.WARN:
        console.warn(formattedMessage);
        break;
      case SeverityNumber.DEBUG:
      case SeverityNumber.TRACE:
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }
}
