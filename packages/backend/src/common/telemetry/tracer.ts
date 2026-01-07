import { trace, Span, SpanStatusCode, context } from '@opentelemetry/api';

/**
 * Get a tracer instance for manual span creation.
 * @param name - The name of the tracer (typically the module or service name)
 */
export function getTracer(name: string = 'backend-service') {
  return trace.getTracer(name);
}

/**
 * Set attributes on the current active span.
 * @param attributes - Key-value pairs to add as span attributes
 */
export function setSpanAttributes(attributes: Record<string, any>) {
  const span = trace.getActiveSpan();
  if (span) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        span.setAttribute(key, value);
      }
    });
  }
}

/**
 * Record an exception in the current active span.
 * @param error - The error to record
 * @param fatal - Whether the error is fatal (defaults to true)
 */
export function recordSpanException(error: Error, fatal: boolean = true) {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: fatal ? SpanStatusCode.ERROR : SpanStatusCode.OK,
      message: error.message,
    });
  }
}

/**
 * Execute a function within a custom span.
 * @param spanName - The name of the span
 * @param fn - The function to execute
 * @param attributes - Optional attributes to set on the span
 */
export async function withSpan<T>(
  spanName: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, any>,
): Promise<T> {
  const tracer = getTracer();
  return tracer.startActiveSpan(spanName, async (span: Span) => {
    try {
      if (attributes) {
        setSpanAttributes(attributes);
      }
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      recordSpanException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Execute a synchronous function within a custom span.
 * @param spanName - The name of the span
 * @param fn - The function to execute
 * @param attributes - Optional attributes to set on the span
 */
export function withSpanSync<T>(
  spanName: string,
  fn: (span: Span) => T,
  attributes?: Record<string, any>,
): T {
  const tracer = getTracer();
  return tracer.startActiveSpan(spanName, (span: Span) => {
    try {
      if (attributes) {
        setSpanAttributes(attributes);
      }
      const result = fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      recordSpanException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
