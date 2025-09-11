import importlib
import json
import structlog
from pathlib import Path
from typing import Dict, Type

from .generators.base_generator import BaseGenerator

log = structlog.getLogger(__name__)


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
        log.info(
            f"Loading generator configurations from {self.config_path}",
            method="_load_generators",
        )
        try:
            with open(self.config_path) as f:
                config = json.load(f)

            for name, gen_config in config.get("generators", {}).items():
                module_path = gen_config.get("module")
                class_name = gen_config.get("class")

                if not module_path or not class_name:
                    log.warning(
                        f"Skipping invalid generator config for '{name}'",
                        method="_load_generators",
                    )
                    continue

                try:
                    module = importlib.import_module(module_path)
                    generator_class = getattr(module, class_name)
                    self._generators[name] = generator_class
                    log.info(
                        f"Successfully loaded generator '{name}' -> {module_path}.{class_name}",
                        method="_load_generators",
                    )
                except (ImportError, AttributeError) as e:
                    log.error(
                        f"Failed to load generator '{name}': {e}",
                        method="_load_generators",
                    )
        except FileNotFoundError:
            log.error(
                f"Generator config file not found at {self.config_path}",
                method="_load_generators",
            )
        except json.JSONDecodeError:
            log.error(
                f"Error decoding JSON from {self.config_path}",
                method="_load_generators",
            )

    def get_generator_class(self, generator_name: str) -> Type[BaseGenerator] | None:
        """Returns the class for a given generator name."""
        return self._generators.get(generator_name)
