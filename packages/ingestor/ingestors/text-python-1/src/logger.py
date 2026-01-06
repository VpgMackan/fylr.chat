import os
import logging
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.sdk.resources import Resource


def setup_logger(name: str = "text-ingestor") -> logging.Logger:
    """
    Set up a logger with OpenTelemetry integration for PostHog.

    Args:
        name: The name of the logger

    Returns:
        A configured logger instance
    """
    posthog_api_key = os.getenv("POSTHOG_API_KEY")
    posthog_host = os.getenv("POSTHOG_HOST", "https://us.i.posthog.com")
    service_name = os.getenv("OTEL_SERVICE_NAME", "text-ingestor")

    # Create resource with service information
    resource = Resource.create(
        {
            "service.name": service_name,
            "service.version": "1.0.0",
        }
    )

    # Configure the standard logger
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Set up OpenTelemetry logging if PostHog is configured
    if posthog_api_key:
        # Configure the logger provider with resource
        logger_provider = LoggerProvider(resource=resource)

        # Create OTLP exporter for PostHog logs
        otlp_exporter = OTLPLogExporter(
            endpoint=f"{posthog_host}/i/v1/logs",
            headers={"Authorization": f"Bearer {posthog_api_key}"},
        )

        # Add processor
        logger_provider.add_log_record_processor(BatchLogRecordProcessor(otlp_exporter))

        # Add OpenTelemetry handler to send logs to PostHog
        otel_handler = LoggingHandler(logger_provider=logger_provider)
        otel_handler.setLevel(logging.INFO)
        logger.addHandler(otel_handler)

    # Add console handler (avoid adding multiple times)
    if not any(isinstance(h, logging.StreamHandler) for h in logger.handlers):
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    return logger


# Create default logger instance
logger = setup_logger()
