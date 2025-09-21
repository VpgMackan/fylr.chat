import structlog
import json
import re
import os
import tempfile
import shutil
import io
import uuid
import time
from typing import List, Tuple, Dict, Any

import boto3
from botocore.client import Config
from botocore.exceptions import BotoCoreError, ClientError

import numpy as np
import librosa
from pydub import AudioSegment

from sqlalchemy.orm import Session
from pika.adapters.blocking_connection import BlockingChannel
from pika.spec import Basic, BasicProperties

from ...config import settings
from ...entity import Podcast
from ..base_generator import BaseGenerator
from ..vector_helper import VectorHelper
from ..database_helper import DatabaseHelper
from ...services.ai_gateway_service import ai_gateway_service

log = structlog.getLogger(__name__)


class PodcastGenerator(BaseGenerator, DatabaseHelper, VectorHelper):
    HOST_VOICES = {
        "Host A": "Aaliyah-PlayAI",
        "Host B": "Basil-PlayAI",
    }

    def validate_input(self, input_data: dict) -> bool:
        return True

    def _parse_script(self, script: str) -> List[Tuple[str, str]]:
        pattern = re.compile(r"\[(Host\s[AB])\]:\s*(.*)")
        lines = script.strip().split("\n")
        parsed_script = []
        for line in lines:
            match = pattern.match(line)
            if match:
                speaker, dialogue = match.groups()
                if dialogue.strip():
                    parsed_script.append((speaker.strip(), dialogue.strip()))
        return parsed_script

    def _combine_audio_chunks(
        self, file_paths: List[str], pause_ms: int = 250, top_db: int = 20
    ) -> bytes:
        podcast = AudioSegment.empty()
        log.info(f"Combining {len(file_paths)} audio chunks...")
        for file_path in sorted(file_paths):
            try:
                y, sr = librosa.load(file_path, sr=None)
                if len(y) == 0:
                    continue
                y_trimmed, _ = librosa.effects.trim(y, top_db=top_db)
                y_trimmed_int = (y_trimmed * 32767).astype(np.int16)
                sound = AudioSegment(
                    y_trimmed_int.tobytes(),
                    frame_rate=sr,
                    sample_width=y_trimmed_int.dtype.itemsize,
                    channels=1,
                )
                podcast += sound
                podcast += AudioSegment.silent(duration=pause_ms)
            except Exception as e:
                log.error(
                    f"Error processing audio file {file_path}: {e}",
                    method="_combine_audio_chunks",
                )
        buffer = io.BytesIO()
        podcast.export(buffer, format="wav")
        buffer.seek(0)
        return buffer.read()

    def _upload_to_s3(self, data: bytes, key: str) -> str:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.s3_key_id,
            aws_secret_access_key=settings.s3_secret_key,
            endpoint_url=f"http://{settings.s3_endpoint}:{settings.s3_port}",
            region_name=settings.s3_region,
            config=Config(s3={"addressing_style": "path"}),
        )
        bucket = settings.s3_bucket_podcast_audio
        try:
            s3_client.upload_fileobj(io.BytesIO(data), bucket, key)
            log.info(f"Successfully uploaded audio to s3://{bucket}/{key}")
            return key
        except (BotoCoreError, ClientError) as e:
            log.error(f"Failed to upload audio to S3: {e}", method="_upload_to_s3")
            raise

    def _generate_segment_summaries(
        self, groups: List[List[Any]], channel: BlockingChannel, podcast_id: str
    ) -> List[Dict]:
        """Processes vector groups to generate high-level segment summaries."""
        summaries = []
        total_groups = len(groups)
        for i, group in enumerate(groups):
            self._publish_status(
                channel,
                podcast_id,
                {
                    "stage": "summarizing_segments",
                    "message": f"Summarizing content segment {i + 1} of {total_groups}...",
                },
                "podcast",
            )
            content_snippets = "\n\n---\n\n".join(
                [vector.content for vector in group[:15]]
            )
            try:
                response_str = ai_gateway_service.generate_text(
                    {
                        "prompt_type": "podcast_segment",
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

    def _generate_final_script(
        self, summaries: List[Dict], channel: BlockingChannel, podcast_id: str
    ) -> str:
        """Generates the final, cohesive script from segment summaries."""
        self._publish_status(
            channel,
            podcast_id,
            {
                "stage": "writing_final_script",
                "message": "Writing the final podcast script...",
            },
            "podcast",
        )

        summaries_text = ""
        for i, summary in enumerate(summaries):
            summaries_text += f"Segment {i + 1}:\n"
            summaries_text += f"  Title: {summary.get('title', 'N/A')}\n"
            summaries_text += "  Keynotes:\n"
            for keynote in summary.get("keynotes", []):
                summaries_text += f"    - {keynote}\n"
            summaries_text += "\n"

        final_script = ai_gateway_service.generate_text(
            {
                "prompt_type": "podcast_script_combiner",
                "prompt_version": "v1",
                "prompt_vars": {"segment_summaries": summaries_text},
            }
        )
        return final_script

    def _create_podcast(self, db: Session, channel: BlockingChannel, podcast: Podcast):
        log.info(
            f"Generating podcast for '{podcast.title}' (ID: {podcast.id})",
            method="_create_podcast",
        )
        self._publish_status(
            channel,
            podcast.id,
            {"stage": "starting", "message": "Starting podcast generation..."},
            "podcast",
        )

        episode = podcast.episodes[0]

        self._publish_status(
            channel,
            podcast.id,
            {"stage": "fetching_vectors", "message": "Gathering content..."},
            "podcast",
        )
        sources = self._fetch_sources_with_vectors(db, podcast.pocket_id)
        if not sources:
            raise ValueError("No sources with content found in this pocket.")

        self._publish_status(
            channel,
            podcast.id,
            {"stage": "clustering", "message": "Analyzing and grouping content..."},
            "podcast",
        )
        vector_groups = self._cluster_source_vector(sources)
        log.info(f"Clustered content into {len(vector_groups)} thematic groups.")

        segment_summaries = self._generate_segment_summaries(
            vector_groups, channel, podcast.id
        )
        if not segment_summaries:
            raise ValueError(
                "Failed to generate any valid segment summaries from the content."
            )

        final_script = self._generate_final_script(
            segment_summaries, channel, podcast.id
        )
        parsed_script = self._parse_script(final_script)
        if not parsed_script:
            raise ValueError(
                "Failed to generate a valid final script from segment summaries."
            )

        log.info(f"Generated final script with {len(parsed_script)} lines.")

        temp_dir = tempfile.mkdtemp()
        try:
            self._publish_status(
                channel,
                podcast.id,
                {
                    "stage": "generating_audio",
                    "message": f"Recording dialogue for {len(parsed_script)} lines...",
                },
                "podcast",
            )
            audio_files = []
            for i, (speaker, line) in enumerate(parsed_script):
                voice = self.HOST_VOICES.get(speaker, "default_voice")
                audio_bytes = ai_gateway_service.generate_tts(text=line, voice=voice)
                file_path = os.path.join(temp_dir, f"line_{i:04d}.wav")
                with open(file_path, "wb") as f:
                    f.write(audio_bytes)
                audio_files.append(file_path)

                time.sleep(5)

            self._publish_status(
                channel,
                podcast.id,
                {"stage": "combining_audio", "message": "Editing and mixing audio..."},
                "podcast",
            )
            final_audio_bytes = self._combine_audio_chunks(audio_files)

            self._publish_status(
                channel,
                podcast.id,
                {"stage": "uploading", "message": "Uploading final podcast..."},
                "podcast",
            )
            audio_key = f"{podcast.id}/{uuid.uuid4()}.wav"
            self._upload_to_s3(final_audio_bytes, audio_key)

            episode.content = final_script
            episode.audio_key = audio_key
            podcast.generated = "COMPLETED"
            db.commit()

            self._publish_status(
                channel,
                podcast.id,
                {
                    "stage": "completed",
                    "message": "Podcast is ready!",
                    "audioKey": audio_key,
                },
                "podcast",
            )
            log.info(f"Successfully completed podcast generation for ID: {podcast.id}")

        finally:
            shutil.rmtree(temp_dir)

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
            Podcast,
            self._create_podcast,
            "podcast",
        )
