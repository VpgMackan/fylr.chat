from .openai_compatible import OpenaiCompatibleProvider
from .jina import JinaProvider

from ..config import settings

providers = {
    "ollama": OpenaiCompatibleProvider(
        api_key="ollama", base_url=settings.ollama_base_url
    ),
    "openai": OpenaiCompatibleProvider(
        api_key=settings.openai_api_key, base_url=settings.llm_proxy_url
    ),
    "jina": JinaProvider(),
}
