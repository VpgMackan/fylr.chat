import importlib
import json
import logging
from pathlib import Path
from typing import Dict, Type

from .generators.base_generator import BaseGenerator

logger = logging.getLogger(__name__)


class GeneratorService:
    def __init__(self, config_path: Path = None):
        if config_path is None:
            current_dir = Path(__file__).parent
            config_path = current_dir / "config" / "generators_config.json"

        self.config_path = config_path
        self._generators: Dict[str, Type[BaseGenerator]] = {}
        self._load_generators()

    def _load_generators(self):
        """Loads generator classes from the configuration file."""
        logger.info(f"Loading generator configurations from {self.config_path}")
        try:
            with open(self.config_path) as f:
                config = json.load(f)

            for name, gen_config in config.get("generators", {}).items():
                module_path = gen_config.get("module")
                class_name = gen_config.get("class")

                if not module_path or not class_name:
                    logger.warning(f"Skipping invalid generator config for '{name}'")
                    continue

                try:
                    module = importlib.import_module(module_path)
                    generator_class = getattr(module, class_name)
                    self._generators[name] = generator_class
                    logger.info(
                        f"Successfully loaded generator '{name}' -> {module_path}.{class_name}"
                    )
                except (ImportError, AttributeError) as e:
                    logger.error(f"Failed to load generator '{name}': {e}")
        except FileNotFoundError:
            logger.error(f"Generator config file not found at {self.config_path}")
        except json.JSONDecodeError:
            logger.error(f"Error decoding JSON from {self.config_path}")

    def get_generator_class(self, generator_name: str) -> Type[BaseGenerator] | None:
        """Returns the class for a given generator name."""
        return self._generators.get(generator_name)
