from typing import Dict, Callable
from .pdf import handle_pdf


class HandlerManager:
    """Manages PDF file handler."""

    def __init__(self):
        self.handlers: Dict[str, Callable] = {
            ".pdf": handle_pdf,
        }

    def process_data(self, file_extension: str, file_content: bytes, **kwargs) -> str:
        """
        Process file content based on file extension.

        Args:
            file_extension: The file extension (e.g., '.pdf')
            file_content: The raw file content as bytes
            **kwargs: Additional arguments to pass to the handler

        Returns:
            Extracted text content as string

        Raises:
            ValueError: If file extension is not supported
        """
        # Normalize extension to lowercase
        ext = file_extension.lower()
        handler = self.handlers.get(ext)
        if not handler:
            raise ValueError(f"No handler found for file extension: {file_extension}")

        return handler(file_content, **kwargs)

    def supports(self, file_extension: str) -> bool:
        """Check if a file extension is supported."""
        return file_extension.lower() in self.handlers
