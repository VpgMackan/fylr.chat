from langchain_text_splitters import RecursiveCharacterTextSplitter

supported_types = [
    "text/plain",
    "text/markdown",
    "application/octet-stream",
]
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
    add_start_index=True,
    separators=["\n\n", "\n", " ", ""],
)


def handle(buffer: bytes, job_key: str, info_callback: callable):
    info_callback("Decoding and preparing markdown text...", job_key)

    text = buffer.decode("utf-8")
    if not text:
        info_callback("Buffer was empty, no text to process.", job_key)
        raise ValueError("Empty buffer received")

    all_chunks = text_splitter.split_text(text)
    if not all_chunks:
        info_callback("Text splitting resulted in zero chunks.", job_key)
        raise ValueError("No chunks created from the text")

    message = f"Successfully created {len(all_chunks)} chunks from the text."
    info_callback(
        message, job_key, {"chunk_count": len(all_chunks), "message": message}
    )
    return all_chunks
