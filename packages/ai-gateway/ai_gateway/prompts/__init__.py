from pathlib import Path
from .registry import PromptRegistry

# Create a shared instance that can be imported by other modules
PROMPTS_DIR = Path(__file__).parent / "config"
prompt_registry = PromptRegistry(PROMPTS_DIR)
