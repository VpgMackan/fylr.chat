"""Handler for PDF files."""

import io
import pymupdf


def handle_pdf(file_content: bytes, **kwargs) -> str:
    """
    Extract text from PDF files.

    Args:
        file_content: Raw PDF file content as bytes
        **kwargs: Additional arguments (unused for PDF files)

    Returns:
        Extracted text as string
    """
    try:
        pdf_file = io.BytesIO(file_content)

        doc = pymupdf.open(stream=pdf_file, filetype="pdf")
        text_parts = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text_parts.append(page.get_text("text"))

        full_text = "\n\n".join(text_parts)
        return full_text.strip()
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {e}")
