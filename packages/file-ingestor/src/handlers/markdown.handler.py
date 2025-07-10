import logging
from langchain_text_splitters import RecursiveCharacterTextSplitter

supported_types = [
    "text/plain",
    "text/markdown",
    "application/octet-stream",
]
logger = logging.getLogger(__name__)
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
    add_start_index=True,
    separators=["\n\n", "\n", " ", ""],
)


def handle(buffer: bytes) -> str:
    text = buffer.decode("utf-8")
    if not text:
        logger.warning("Received empty buffer, returning empty string.")
        return ""

    all_chunks = text_splitter.split_text(text)
    if not all_chunks:
        logger.warning("No chunks were created from the text.")
        return ""

    logger.info(f"Created {len(all_chunks)} chunks from the text.")
    return all_chunks
