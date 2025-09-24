import structlog
from typing import Dict, Type

from .generators.base_generator import BaseGenerator
from .generators.summary.summary_generator import SummaryGenerator
from .generators.podcast.podcast_generator import PodcastGenerator
from .generators.video.video_generator import VideoGenerator

log = structlog.getLogger(__name__)


class GeneratorService:
    GENERATOR_CONFIGS = {
        "summary": {
            "queue_name": "summary-generator",
            "dlq_name": "summary-generator.dlq",
            "routing_key": "summary-generator",
        },
        "podcast": {
            "queue_name": "podcast-generator",
            "dlq_name": "podcast-generator.dlq",
            "routing_key": "podcast-generator",
        },
        "video": {
            "queue_name": "video-generator",
            "dlq_name": "video-generator.dlq",
            "routing_key": "video-generator",
        },
    }

    def __init__(self):
        self._generators: Dict[str, Type[BaseGenerator]] = {
            "summary": SummaryGenerator,
            "podcast": PodcastGenerator,
            "video": VideoGenerator,
        }

    def get_generator_class(self, generator_name: str) -> Type[BaseGenerator] | None:
        """Returns the class for a given generator name."""
        return self._generators.get(generator_name)

    def get_generator_configs(self):
        """Returns the configuration for all generators."""
        return self.GENERATOR_CONFIGS
