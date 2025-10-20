import os
from typing import Optional
import PyPDF2
from io import BytesIO

class PDFProcessor:
    """Utility class for processing PDF files"""

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_TEXT_LENGTH = 50000  # Maximum characters to extract

    @staticmethod
    def extract_text(file_content: bytes, filename: str) -> str:
        """Extract text from PDF file content"""
        try:
            # Create BytesIO object from file content
            pdf_file = BytesIO(file_content)

            # Create PDF reader
            pdf_reader = PyPDF2.PdfReader(pdf_file)

            # Extract text from all pages
            text_parts = []
            total_chars = 0

            for page_num, page in enumerate(pdf_reader.pages, 1):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        # Add page separator
                        text_parts.append(f"\n--- Page {page_num} ---\n")
                        text_parts.append(page_text)

                        total_chars += len(page_text)

                        # Limit total text length
                        if total_chars > PDFProcessor.MAX_TEXT_LENGTH:
                            text_parts.append(f"\n\n[Text truncated at {PDFProcessor.MAX_TEXT_LENGTH} characters]")
                            break
                except Exception as e:
                    text_parts.append(f"\n[Error extracting page {page_num}: {str(e)}]\n")

            full_text = "".join(text_parts)

            if not full_text.strip():
                return "[No text could be extracted from this PDF. It may contain only images or be encrypted.]"

            return full_text

        except Exception as e:
            raise Exception(f"Error processing PDF '{filename}': {str(e)}")

    @staticmethod
    def validate_pdf(file_content: bytes, filename: str) -> tuple[bool, Optional[str]]:
        """Validate PDF file"""

        # Check file size
        if len(file_content) > PDFProcessor.MAX_FILE_SIZE:
            return False, f"File size exceeds maximum of {PDFProcessor.MAX_FILE_SIZE // (1024 * 1024)}MB"

        # Check file extension
        if not filename.lower().endswith('.pdf'):
            return False, "File must be a PDF"

        # Check if file is actually a PDF
        try:
            pdf_file = BytesIO(file_content)
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            # Try to access pages to verify it's a valid PDF
            _ = len(pdf_reader.pages)
        except Exception as e:
            return False, f"Invalid PDF file: {str(e)}"

        return True, None
