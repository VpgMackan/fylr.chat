import logging
import yaml
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

log = logging.getLogger(__name__)


class ModelsRegistry:
    """Manages the registry of available embedding models."""

    def __init__(self):
        self.models: List[Dict] = []
        self.default_model: Optional[str] = None
        self._load_models()

    def _load_models(self):
        """Load models from the models.yaml configuration file."""
        config_path = Path(__file__).parent / "config" / "models.yaml"

        try:
            with open(config_path, "r") as f:
                config = yaml.safe_load(f)

            if not config or "models" not in config:
                log.warning(f"No models found in {config_path}")
                return

            self.models = config["models"]

            # Find the default model
            for model in self.models:
                if model.get("isDefault"):
                    self.default_model = self._build_model_string(model)
                    break

            if not self.default_model:
                log.warning("No default model specified in models.yaml")

            log.info(
                f"Loaded {len(self.models)} models from {config_path}",
                extra={"default_model": self.default_model},
            )
        except FileNotFoundError:
            log.error(f"Models configuration file not found: {config_path}")
        except yaml.YAMLError as e:
            log.error(f"Error parsing models.yaml: {e}")
        except Exception as e:
            log.error(f"Unexpected error loading models: {e}")

    @staticmethod
    def _build_model_string(model: Dict) -> str:
        """Build the full model string from components: timestamp@version@provider/model"""
        return f"{model['timestamp']}@{model['version']}@{model['provider']}/{model['model']}"

    def get_all_models(self) -> Dict:
        """Get all models in the expected API response format."""
        models_list = []
        for model in self.models:
            models_list.append(
                {
                    "provider": model["provider"],
                    "model": model["model"],
                    "version": model["version"],
                    "timestamp": model["timestamp"],
                    "dimensions": model["dimensions"],
                    "isDefault": model.get("isDefault", False),
                    "isDeprecated": model.get("isDeprecated", False),
                    "deprecationDate": model.get("deprecationDate"),
                    "fullModel": self._build_model_string(model),
                }
            )
        return {
            "models": models_list,
            "default": self.default_model,
        }

    def get_default_model(self) -> Optional[str]:
        """Get the default model string."""
        return self.default_model

    def get_model(self, provider: str, model: str) -> Optional[Dict]:
        """Get a specific model by provider and model name."""
        for m in self.models:
            if m["provider"] == provider and m["model"] == model:
                return m
        return None

    def set_default_model(self, provider: str, model: str) -> bool:
        """Set a model as the default and save to YAML file."""
        target_model = self.get_model(provider, model)
        if not target_model:
            log.error(
                f"Model not found: {provider}/{model}",
                extra={"provider": provider, "model": model},
            )
            return False

        # Remove default from all models
        for m in self.models:
            m["isDefault"] = False

        # Set the target model as default
        target_model["isDefault"] = True
        self.default_model = self._build_model_string(target_model)

        # Save to YAML file
        self._save_models()
        log.info(
            f"Default model changed to {provider}/{model}",
            extra={"provider": provider, "model": model, "fullModel": self.default_model},
        )
        return True

    def deprecate_model(
        self, provider: str, model: str, deprecation_date: str
    ) -> bool:
        """Mark a model as deprecated with a deprecation date and save to YAML file."""
        target_model = self.get_model(provider, model)
        if not target_model:
            log.error(
                f"Model not found: {provider}/{model}",
                extra={"provider": provider, "model": model},
            )
            return False

        target_model["isDeprecated"] = True
        target_model["deprecationDate"] = deprecation_date

        # Save to YAML file
        self._save_models()
        log.info(
            f"Model deprecated: {provider}/{model}",
            extra={
                "provider": provider,
                "model": model,
                "deprecationDate": deprecation_date,
            },
        )
        return True

    def _save_models(self):
        """Save the current models to the YAML configuration file."""
        config_path = Path(__file__).parent / "config" / "models.yaml"

        try:
            config = {"models": self.models}
            with open(config_path, "w") as f:
                yaml.dump(config, f, default_flow_style=False, sort_keys=False)
            log.info(f"Models saved to {config_path}")
        except Exception as e:
            log.error(f"Error saving models to {config_path}: {e}")


# Initialize the global registry
models_registry = ModelsRegistry()
