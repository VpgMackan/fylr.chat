from .providers.openai_compatible import OpenaiCompatibleProvider
from .providers.jina import JinaProvider
from .providers.auto import AutoProvider
from .providers.elevenlabs import ElevenLabsProvider

from ..config import settings

# Create base providers first
_base_providers = {
    "ollama": OpenaiCompatibleProvider(
        api_key="ollama", base_url=settings.ollama_base_url
    ),
    "openai": OpenaiCompatibleProvider(
        api_key=settings.openai_api_key, base_url=settings.llm_proxy_url
    ),
    "jina": JinaProvider(),
    "elevenlabs": ElevenLabsProvider(),
}

# Create auto provider with reference to base providers
providers = {
    **_base_providers,
    "auto": AutoProvider(_base_providers),
}


def get_provider(provider_name: str):
    """
    Get a provider instance by name.

    Args:
        provider_name: The name of the provider (e.g., "jina", "openai", "auto")

    Returns:
        The provider instance

    Raises:
        ValueError: If the provider name is not found
    """
    if provider_name not in providers:
        raise ValueError(
            f"Provider '{provider_name}' not found. Available providers: {', '.join(providers.keys())}"
        )
    return providers[provider_name]
