"""Handler for PDF files."""

import io
from unstructured.partition.pdf import partition_pdf
from unstructured.staging.base import elements_to_text


def handle_pdf(file_content: bytes, **kwargs) -> str:
    """
    Extract text from PDF files using unstructured library for enhanced content extraction.

    This handler extracts:
    - Text with better layout preservation
    - Tables (converted to text representation)
    - Document structure (headings, paragraphs, lists)
    - Better handling of complex multi-column layouts

    Args:
        file_content: Raw PDF file content as bytes
        **kwargs: Additional arguments:
            - extract_images: bool - Whether to extract images (default: False)
            - strategy: str - Extraction strategy: "auto", "fast", or "hi_res" (default: "auto")

    Returns:
        Extracted text as string with preserved structure
    """
    try:
        pdf_file = io.BytesIO(file_content)

        extract_images = kwargs.get("extract_images", False)
        strategy = kwargs.get("strategy", "auto")

        elements = partition_pdf(
            file=pdf_file,
            strategy=strategy,
            extract_images_in_pdf=extract_images,
            infer_table_structure=True,
            include_page_breaks=False,
        )

        full_text = elements_to_text(elements)

        return full_text.strip()
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {e}")
