from .ollama import OllamaProvider
from .openai import OpenaiProvider
from .jina import JinaProvider

providers = {
    "ollama": OllamaProvider(),
    "openai": OpenaiProvider(),
    "jina": JinaProvider(),
}
