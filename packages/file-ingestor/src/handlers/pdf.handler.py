import logging
from langchain_text_splitters import RecursiveCharacterTextSplitter

import pymupdf

supported_types = ["application/pdf"]
logger = logging.getLogger(__name__)
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
    add_start_index=True,
    separators=["\n\n", "\n", " ", ""],
)


# TODO: implement tools like docling for more accuret parsing
def handle(buffer: bytes) -> str:
    # Decode the pdf buffer
    doc = pymupdf.open(stream=buffer)
    text = ""
    for page in doc:
        text += page.get_text()

    if not text:
        logger.warning("Received empty buffer, returning empty string.")
        return ""

    all_chunks = text_splitter.split_text(text)
    if not all_chunks:
        logger.warning("No chunks were created from the text.")
        return ""

    logger.info(f"Created {len(all_chunks)} chunks from the text.")
    return all_chunks
