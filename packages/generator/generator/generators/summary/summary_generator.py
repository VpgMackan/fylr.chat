from ..base_generator import BaseGenerator


class SummaryGenerator(BaseGenerator):
    def generate(self, ch, method, properties, body: bytes):
        print(body.decode("utf-8"))
        # Your existing summary generation logic here
        pass

    def validate_input(self, input_data):
        # Validate the input data before processing
        pass


'''
    def fetch_sources(self, pocket_id):
        """
        Get all the vectors grouped by source and chunkIndex and store them in an array like this:
        [{id, name, type, url, content}, .....]
        Content is all the vectors joined together based on chunkIndex
        """

        try:
            sources = (
                self.session.query(Source)
                .options(joinedload(Source.vectors))
                .filter(Source.pocket_id == pocket_id)
                .all()
            )

            result = []

            for source in sources:
                vectors_by_chunk = defaultdict(list)
                for vector in source.vectors:
                    vectors_by_chunk[vector.chunk_index].append(vector.content)

                sorted_chunks = sorted(vectors_by_chunk.items())
                content_parts = []
                for chunk_index, contents in sorted_chunks:
                    chunk_content = " ".join(contents)
                    content_parts.append(chunk_content)

                full_content = " ".join(content_parts)

                source_entry = {
                    "id": source.id,
                    "name": source.name,
                    "type": source.type,
                    "url": source.url,
                    "content": full_content,
                }

                result.append(source_entry)

            print(f"Found {len(result)} sources for pocket {pocket_id}")
            return result

        except Exception as e:
            print(f"Error fetching sources for pocket {pocket_id}: {e}")
            raise

    def process_summary(self, ch, method, properties, body: bytes) -> None:
        try:
            summary_id_str = body.decode("utf-8")
            uuid.UUID(summary_id_str)
            print(f"Processing summary ID: {summary_id_str}")

            summary = self.session.get(Summary, summary_id_str)
            if summary:
                print(f"Found summary: {summary.title}")
                print(self.fetch_sources(summary.pocket_id))
                ch.basic_ack(delivery_tag=method.delivery_tag)
            else:
                print(f"Summary with ID {summary_id_str} not found")
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except ValueError as e:
            print(f"Invalid UUID format: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        except Exception as e:
            print(f"Error processing summary: {e}")
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
'''
