import structlog
import json
import io
from typing import List, Dict, Any

import boto3
from botocore.client import Config
from botocore.exceptions import BotoCoreError, ClientError

from sqlalchemy.orm import Session
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from ...config import settings
from ...entity import Video
from ..base_generator import BaseGenerator
from ..vector_helper import VectorHelper
from ..database_helper import DatabaseHelper
from ...services.ai_gateway_service import ai_gateway_service

log = structlog.getLogger(__name__)


class VideoGenerator(BaseGenerator, DatabaseHelper, VectorHelper):
    def validate_input(self, input_data: dict) -> bool:
        return True

    def _upload_to_s3(self, data: bytes, key: str) -> str:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.s3_key_id,
            aws_secret_access_key=settings.s3_secret_key,
            endpoint_url=f"http://{settings.s3_endpoint}:{settings.s3_port}",
            region_name=settings.s3_region,
            config=Config(s3={"addressing_style": "path"}),
        )
        bucket = settings.s3_bucket_video_content
        try:
            s3_client.upload_fileobj(io.BytesIO(data), bucket, key)
            log.info(f"Successfully uploaded content to s3://{bucket}/{key}")
            return key
        except (BotoCoreError, ClientError) as e:
            log.error(f"Failed to upload content to S3: {e}", method="_upload_to_s3")
            raise

    def _generate_segment_summaries(
        self, groups: List[List[Any]], channel: BlockingChannel, video_id: str
    ) -> List[Dict]:
        """Processes vector groups to generate high-level segment summaries."""
        summaries = []
        total_groups = len(groups)
        for i, group in enumerate(groups):
            self._publish_status(
                channel,
                video_id,
                {
                    "stage": "summarizing_segments",
                    "message": f"Summarizing content segment {i + 1} of {total_groups}...",
                },
                "video",
            )
            content_snippets = "\n\n---\n\n".join(
                [vector.content for vector in group[:15]]
            )
            try:
                response_str = ai_gateway_service.generate_text(
                    {
                        "prompt_type": "video_segment",
                        "prompt_version": "v1",
                        "prompt_vars": {"content_snippets": content_snippets},
                    }
                )
                segment_data = json.loads(response_str)
                summaries.append(segment_data)
            except (json.JSONDecodeError, Exception) as e:
                log.error(
                    f"Failed to generate or parse segment summary for group {i}: {e}"
                )
        return summaries

    def _create_video(self, db: Session, channel: BlockingChannel, video: Video):
        log.info(
            f"Generating video for '{video.title}' (ID: {video.id})",
            method="_create_video",
        )
        self._publish_status(
            channel,
            video.id,
            {"stage": "starting", "message": "Starting video generation..."},
            "video",
        )

        self._publish_status(
            channel,
            video.id,
            {"stage": "fetching_vectors", "message": "Gathering content..."},
            "video",
        )
        sources = self._fetch_sources_with_vectors(db, video.pocket_id)
        if not sources:
            raise ValueError("No sources with content found in this pocket.")

        self._publish_status(
            channel,
            video.id,
            {"stage": "clustering", "message": "Analyzing and grouping content..."},
            "video",
        )
        vector_groups = self._cluster_source_vector(sources)
        log.info(f"Clustered content into {len(vector_groups)} thematic groups.")

        segment_summaries = self._generate_segment_summaries(
            vector_groups, channel, video.id
        )
        if not segment_summaries:
            raise ValueError(
                "Failed to generate any valid segment summaries from the content."
            )

        log.info(f"Generated {len(segment_summaries)} segment summaries.")

        # TODO: Implement video generation logic here
        video.generated = "COMPLETED"
        db.commit()

        self._publish_status(
            channel,
            video.id,
            {
                "stage": "completed",
                "message": "Video processing completed!",
            },
            "video",
        )
        log.info(f"Successfully completed video generation for ID: {video.id}")

    def generate(
        self,
        db: Session,
        channel: BlockingChannel,
        method: Basic.Deliver,
        properties: BasicProperties,
        body: bytes,
    ) -> None:
        self._process_message(
            db,
            channel,
            method,
            properties,
            body,
            Video,
            self._create_video,
            "video",
        )
