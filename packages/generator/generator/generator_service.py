import importlib
import json
from pathlib import Path


class GeneratorService:
    def __init__(self, config_path=None):
        if config_path is None:
            # Use path relative to this file's location
            current_dir = Path(__file__).parent
            config_path = current_dir / "config" / "generators_config.json"
        self.config_path = config_path
        self.generators = {}
        self.load_generators()

    def load_generators(self):
        with open(self.config_path) as f:
            config = json.load(f)
        for generator_name, generator_config in config["generators"].items():
            module = importlib.import_module(
                f"generators.{generator_name}.{generator_name}_generator"
            )
            generator_class = getattr(module, f"{generator_name.capitalize()}Generator")
            self.generators[generator_name] = generator_class()

    def get_generator(self, generator_name):
        return self.generators.get(generator_name)
