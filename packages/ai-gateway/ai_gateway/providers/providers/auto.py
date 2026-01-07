import logging
from typing import List, Dict, Any, AsyncGenerator, Tuple
from opentelemetry import trace

from ..base import BaseProvider
from ...prompts.registry import PromptNotFound
from ...prompts import prompt_registry
from ...schemas import ChatCompletionRequest

log = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)


class AutoProvider(BaseProvider):
    """
    A meta-provider that automatically selects the best underlying provider
    and model based on the request's context (e.g., prompt template metadata).
    """

    def __init__(self, providers_registry=None):
        self.providers_registry = providers_registry or {}

    def _select_model(
        self, request: ChatCompletionRequest
    ) -> Tuple[str, str, BaseProvider]:
        """
        Selects the provider and model name based on rules.
        Returns: (provider_name, model_name, provider_instance)
        """

        MODEL_MAP = {
            "default": ("openai", "z-ai/glm-4.5-air:free"),
            "tool": ("openai", "mistralai/devstral-2512:free"),
            "synthesis": ("openai", "mistralai/mistral-small-creative"),
            "simple": ("openai", "openai/gpt-oss-20b"),
        }

        if request.prompt_type:
            try:
                entry = prompt_registry.get_entry(
                    request.prompt_type, request.prompt_version
                )
                complexity = entry.meta.get("complexity", "default")
                provider_name, model_name = MODEL_MAP.get(
                    complexity, MODEL_MAP["default"]
                )

                log.info(
                    "AutoProvider selected model based on prompt meta",
                    extra={
                        "prompt": request.prompt_type,
                        "complexity": complexity,
                        "provider": provider_name,
                        "model": model_name,
                    },
                )
                return provider_name, model_name, self.providers_registry[provider_name]

            except PromptNotFound:
                log.warning("Prompt not found for auto-selection, using fallback.")

        provider_name, model_name = MODEL_MAP["default"]
        log.info(
            "AutoProvider using fallback model",
            extra={
                "provider": provider_name,
                "model": model_name,
            },
        )
        return provider_name, model_name, self.providers_registry[provider_name]

    def generate_text(
        self, messages: List[Dict[str, Any]], request: ChatCompletionRequest
    ):
        """
        Selects a model and delegates the non-streaming call.
        """
        with tracer.start_as_current_span("auto_generate_text") as span:
            provider_name, model_name, provider_instance = self._select_model(request)
            request.model = model_name

            span.set_attribute("selected_provider", provider_name)
            span.set_attribute("selected_model", model_name)

            return provider_instance.generate_text(messages=messages, request=request)

    async def generate_text_stream(
        self, messages: List[Dict[str, Any]], request: ChatCompletionRequest
    ) -> AsyncGenerator[str, None]:
        """
        Selects a model and delegates the streaming call.
        """
        with tracer.start_as_current_span("auto_generate_text_stream") as span:
            provider_name, model_name, provider_instance = self._select_model(request)
            request.model = model_name

            span.set_attribute("selected_provider", provider_name)
            span.set_attribute("selected_model", model_name)

            async for chunk in provider_instance.generate_text_stream(
                messages=messages, request=request
            ):
                yield chunk
