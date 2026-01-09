from .providers.openai_compatible import OpenaiCompatibleProvider
from .providers.auto import AutoProvider
from .providers.elevenlabs import ElevenLabsProvider

from .embedding.jina import JinaEmbeddingProvider
from .embedding.ollama import OllamaEmbeddingProvider

from .base import GeneralProvider, EmbeddingProvider
from ..config import settings

_llm_providers: dict[str, GeneralProvider] = {
    "ollama": OpenaiCompatibleProvider(
        api_key="ollama", base_url=settings.ollama_base_url
    ),
    "openai": OpenaiCompatibleProvider(
        api_key=settings.openai_api_key, base_url=settings.llm_proxy_url
    ),
}

general_providers: dict[str, GeneralProvider] = {
    **_llm_providers,
    "auto": AutoProvider(_llm_providers),
    "elevenlabs": ElevenLabsProvider(),
}

embedding_providers: dict[str, EmbeddingProvider] = {
    "jina": JinaEmbeddingProvider(),
    "ollama": OllamaEmbeddingProvider(),
}


def get_general_provider(provider_name: str) -> GeneralProvider:
    """
    Get a general provider instance by name (chat, tts, etc.).
    """
    if provider_name not in general_providers:
        raise ValueError(
            f"Provider '{provider_name}' not found. Available providers: {', '.join(general_providers.keys())}"
        )
    return general_providers[provider_name]


def get_embedding_provider(provider_name: str) -> EmbeddingProvider:
    """
    Get an embedding-capable provider instance by name.

    Raises:
        ValueError: If the provider name is not found or does not support embeddings.
    """
    if provider_name not in embedding_providers:
        available = ", ".join(embedding_providers.keys()) or "none"
        raise ValueError(
            f"Provider '{provider_name}' does not support embeddings. Available embedding providers: {available}"
        )
    return embedding_providers[provider_name]
