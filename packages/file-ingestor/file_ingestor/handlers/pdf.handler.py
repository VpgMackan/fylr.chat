from langchain_text_splitters import RecursiveCharacterTextSplitter

import pymupdf

supported_types = ["application/pdf"]
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
    add_start_index=True,
    separators=["\n\n", "\n", " ", ""],
)


# TODO: implement tools like docling for more accuret parsing
def handle(buffer: bytes, job_key: str, info_callback: callable):
    info_callback("Decoding and preparing pdf...", job_key)
    doc = pymupdf.open(stream=buffer)
    text = ""
    for page in doc:
        text += page.get_text()

    if not text:
        info_callback("Buffer was empty, no text to process.", job_key)
        raise ValueError("Empty buffer received")

    all_docs = text_splitter.create_documents([text])
    if not all_docs:
        info_callback("Text splitting resulted in zero chunks.", job_key)
        raise ValueError("No chunks created from the text")

    message = f"Successfully created {len(all_docs)} chunks from the text."
    info_callback(message, job_key, {"chunk_count": len(all_docs), "message": message})
    return all_docs
