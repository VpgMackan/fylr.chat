import structlog
import json

from sqlalchemy.orm import Session
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from ...entity import Podcast
from ..base_generator import BaseGenerator
from ..vector_helper import VectorHelper
from ..database_helper import DatabaseHelper
from ...services.ai_gateway_service import ai_gateway_service

log = structlog.getLogger(__name__)


class PodcastGenerator(BaseGenerator, DatabaseHelper, VectorHelper):
    def validate_input(self, input_data: dict) -> bool:
        """This generator expects a simple string body, so this method is not used."""
        return True

    def _validate_podcast_data(self, data: dict) -> dict:
        """Validates the structure and content of generated podcast data."""
        errors = []

        # Check required fields
        required_fields = ["title", "keynotes", "facts"]
        for field in required_fields:
            if field not in data:
                errors.append(f"Missing required field: {field}")
                continue

            if not data[field]:
                errors.append(f"Field '{field}' cannot be empty")

        # Validate title
        if "title" in data and data["title"]:
            title = data["title"].strip()
            if len(title) < 15:
                errors.append("Title must be at least 15 characters long")
            elif len(title) > 80:
                errors.append("Title must be 80 characters or less")
            elif not title:
                errors.append("Title cannot be empty or whitespace only")

        # Validate keynotes
        if "keynotes" in data:
            if not isinstance(data["keynotes"], list):
                errors.append("Keynotes must be a list")
            elif len(data["keynotes"]) < 2:
                errors.append("Must have at least 2 keynotes")
            elif len(data["keynotes"]) > 7:
                errors.append("Cannot have more than 7 keynotes")
            else:
                for i, keynote in enumerate(data["keynotes"]):
                    if not isinstance(keynote, str):
                        errors.append(f"Keynote {i+1} must be a string")
                    elif len(keynote.strip()) < 10:
                        errors.append(f"Keynote {i+1} must be at least 10 characters")
                    elif len(keynote.strip()) > 100:
                        errors.append(f"Keynote {i+1} must be 100 characters or less")

        # Validate facts
        if "facts" in data:
            if not isinstance(data["facts"], list):
                errors.append("Facts must be a list")
            elif len(data["facts"]) < 2:
                errors.append("Must have at least 2 facts")
            elif len(data["facts"]) > 5:
                errors.append("Cannot have more than 5 facts")
            else:
                for i, fact in enumerate(data["facts"]):
                    if not isinstance(fact, str):
                        errors.append(f"Fact {i+1} must be a string")
                    elif len(fact.strip()) < 10:
                        errors.append(f"Fact {i+1} must be at least 10 characters")
                    elif len(fact.strip()) > 150:
                        errors.append(f"Fact {i+1} must be 150 characters or less")

        return {"valid": len(errors) == 0, "errors": errors}

    def _process_groups(self, groups, channel: BlockingChannel, podcast: Podcast):
        """Processes grouped sources and returns validated podcast segments."""
        episode_segments = []

        for group_index, group in enumerate(groups):
            log.info(
                f"Processing group {group_index + 1}/{len(groups)} with {len(group)} sources",
                method="_process_groups",
            )

            self._publish_status(
                channel,
                podcast.id,
                {
                    "stage": "processing",
                    "message": f"Analyzing content group {group_index + 1} of {len(groups)}...",
                },
                "podcast",
            )

            content_snippets = "\n\n---\n\n".join(
                [source.content for source in group[:5]]
            )

            response = ai_gateway_service.generate_text(
                {
                    "prompt_type": "podcast_segment",
                    "prompt_version": "v1",
                    "prompt_vars": {"content_snippets": content_snippets},
                }
            )

            try:
                podcast_data = json.loads(response)

                validation_result = self._validate_podcast_data(podcast_data)
                if not validation_result["valid"]:
                    log.error(
                        f"Validation failed for podcast ID {podcast.id}, group {group_index + 1}: {validation_result['errors']}",
                        method="_process_groups",
                    )
                    self._publish_status(
                        channel,
                        podcast.id,
                        {
                            "stage": "error",
                            "message": f"Generated content validation failed: {', '.join(validation_result['errors'])}",
                        },
                        "podcast",
                    )
                    continue

                podcast_data["group_index"] = group_index + 1
                podcast_data["source_count"] = len(group)

                episode_segments.append(podcast_data)

                log.info(
                    f"Successfully processed group {group_index + 1} for podcast ID {podcast.id}: {podcast_data['title']}",
                    method="_process_groups",
                )

            except json.JSONDecodeError as e:
                log.error(
                    f"Failed to parse AI response as JSON for podcast ID {podcast.id}, group {group_index + 1}: {e}",
                    method="_process_groups",
                )
                self._publish_status(
                    channel,
                    podcast.id,
                    {
                        "stage": "error",
                        "message": f"Invalid JSON response from AI for group {group_index + 1}",
                    },
                    "podcast",
                )
                continue
            except Exception as e:
                log.error(
                    f"Unexpected error processing group {group_index + 1} for podcast ID {podcast.id}: {e}",
                    method="_process_groups",
                )
                self._publish_status(
                    channel,
                    podcast.id,
                    {
                        "stage": "error",
                        "message": f"Unexpected error processing group {group_index + 1}: {str(e)}",
                    },
                    "podcast",
                )
                continue

        return episode_segments

    def _create_podcast(self, db: Session, channel: BlockingChannel, podcast: Podcast):
        """Generates podcast using the AI Gateway and updates the database."""
        log.info(
            f"Generating podcast for '{podcast.title}' (ID: {podcast.id})",
            method="_create_podcast",
        )
        self._publish_status(
            channel,
            podcast.id,
            {
                "stage": "starting",
                "message": f"Starting podcast generation for '{podcast.title}'...",
            },
            "podcast",
        )

        sources = self._fetch_sources_with_vectors(db, podcast.pocket_id)
        groups = self._cluster_source_vector(sources)

        episode_segments = self._process_groups(groups, channel, podcast)

        if episode_segments:
            # The using the facts from episode_segments, and the vectors create a podcast episode for each segment.
            for segment in episode_segments:
                search_queries = segment.get("keynotes", [])
                all_related_docs = []
                for query in search_queries[:3]:
                    related_docs = self._fetch_related_documents(
                        db, query, podcast.pocket_id, limit=5
                    )
                    all_related_docs.extend(related_docs)

                seen_ids = set()
                unique_docs = []
                for doc in all_related_docs:
                    if doc["vector_id"] not in seen_ids:
                        seen_ids.add(doc["vector_id"])
                        unique_docs.append(doc)

                unique_docs.sort(key=lambda x: x["similarity_distance"])
                top_docs = unique_docs[:10]
                if top_docs:
                    context_content = "\n\n".join(
                        [
                            f"Source: {doc['source_name']}\nContent: {doc['content']}"
                            for doc in top_docs
                        ]
                    )
                    context_facts = "\n".join(
                        [f"- {fact}" for fact in segment.get("facts", [])]
                    )
                    episode_content = ai_gateway_service.generate_text(
                        {
                            "prompt_type": "podcast_script",
                            "prompt_version": "v1",
                            "prompt_vars": {
                                "context_content": context_content,
                                "facts": context_facts,
                            },
                        }
                    )
                    log.info(episode_content)

            # log.info(
            #     f"Successfully generated {len(episode_segments)} segments for podcast ID {podcast.id}",
            #     method="_create_podcast",
            # )
            # log.info(episode_segments)
            # self._publish_status(
            #     channel,
            #     podcast.id,
            #     {
            #         "stage": "completed",
            #         "message": f"Podcast generation completed with {len(episode_segments)} segments",
            #         "segments": episode_segments,
            #     },
            #     "podcast",
            # )
        else:
            log.error(
                f"No valid segments generated for podcast ID {podcast.id}",
                method="_create_podcast",
            )
            self._publish_status(
                channel,
                podcast.id,
                {
                    "stage": "error",
                    "message": "No valid content segments could be generated",
                },
                "podcast",
            )

    def generate(
        self,
        db: Session,
        channel: BlockingChannel,
        method: Basic.Deliver,
        properties: BasicProperties,
        body: bytes,
    ) -> None:
        """Processes a podcast generation request."""
        self._process_message(
            db,
            channel,
            method,
            properties,
            body,
            Podcast,
            self._create_podcast,
            "podcast",
        )
