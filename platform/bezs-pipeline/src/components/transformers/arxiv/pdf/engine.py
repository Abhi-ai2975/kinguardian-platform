import logging
from pathlib import Path
from typing import Optional, Dict, Any

from ...base import BaseTransformer
import pypdfium2 as pdfium
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption

from ...schemas import DoclingConfig, PdfContent, PDFValidationError, PDFParsingException, PaperFigure, PaperSection, PaperTable, ParserType

logger = logging.getLogger(__name__)

"""
engine.py
====================================
Purpose:
    An infrastructure-level transformer that utilizes the Docling library 
    to convert raw PDF documents into structured data (Markdown/JSON). 
    It handles deep document analysis including table and figure extraction.
"""

class DoclingEngine(BaseTransformer):
    """
    Purpose:
        Infrastructure Layer — Docling PDF Parser Engine.
    
    Responsibilities:
    - Low-level PDF validation (headers, size, pages).
    - Docling conversion (PDF -> Markdown/JSON).
    - Mapping Docling elements to our internal schemas (Sections, Tables, Figures).
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Purpose:
            Initializes the Docling converter with specified pipeline options 
            such as OCR and table structure recognition.

        Args:
            config (Dict[str, Any]): Configuration dictionary containing 
                                     limits and processing flags.
        """
        # Validate config via Pydantic
        self.config = DoclingConfig(**config)
        
        self.max_pages = self.config.max_pages
        # e.g., max_file_size_mb: 10 -> 10 * 1024 * 1024 = 10,485,760 bytes
        self.max_file_size_bytes = self.config.max_file_size_mb * 1024 * 1024

        pipeline_options = PdfPipelineOptions(
            do_table_structure=self.config.do_table_structure,
            do_ocr=self.config.do_ocr,
        )

        self._converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )
        self._warmed_up = False
        logger.info(f"DoclingEngine ready | Max Pages: {self.max_pages}")

    def _warm_up_models(self):
        """
        Purpose:
            Warms up Docling AI models on first use to reduce latency for 
            subsequent conversion calls.
        """
        if not self._warmed_up:
            logger.info("Warming Docling models...")
            # Internal Docling warm-up happens on first convert() call, 
            # but we flag it here for logging.
            self._warmed_up = True

    def _validate_pdf(self, pdf_path: Path):
        """
        Purpose:
            Performs strict file-level validation including existence, 
            magic byte verification, file size, and page count.

        Args:
            pdf_path (Path): Path to the local PDF file.

        Raises:
            PDFValidationError: If the file is missing, corrupted, or exceeds limits.
        """
        if not pdf_path.exists():
            raise PDFValidationError(f"File not found: {pdf_path}")

        size = pdf_path.stat().st_size      # Asks the Operating System for the file size in bytes
        if size == 0:
            raise PDFValidationError("Empty PDF file")
        if size > self.max_file_size_bytes:
            raise PDFValidationError(f"PDF exceeds size limit: {size} bytes")

        # Check Magic Bytes
        with open(pdf_path, "rb") as f:
            if not f.read(8).startswith(b"%PDF-"):      # Opens the file and looks at the very first 8 characters. Real PDFs always start with %PDF-
                raise PDFValidationError("Invalid PDF header: Not a PDF")

        # Check Page Count via pypdfium2
        pdf_doc = pdfium.PdfDocument(str(pdf_path))
        pages = len(pdf_doc)
        pdf_doc.close()

        if pages > self.max_pages:
            raise PDFValidationError(f"Exceeds max pages ({pages} > {self.max_pages})")

    async def parse_pdf(self, pdf_path: Path) -> Optional[PdfContent]:
        """
        Purpose:
            The main parsing pipeline. Validates the PDF and then uses 
            Docling to extract structured content.

        Args:
            pdf_path (Path): Local path to the PDF to be parsed.

        Returns:
            Optional[PdfContent]: Structured content object or None if validation fails.

        Raises:
            PDFParsingException: If the Docling conversion engine fails.
        """
        try:
            self._validate_pdf(pdf_path)
            self._warm_up_models()

            # Docling conversion
            result = self._converter.convert(
                str(pdf_path),
                max_num_pages=self.max_pages,
                max_file_size=self.max_file_size_bytes,
            )

            doc = result.document       # we are pulling the structured content out of the "Result" wrapper so we can start looping through it to build our PaperSection and PaperTable objects.

            # 1. EXTRACT SECTIONS
            sections = []
            current = {"title": "Header/Intro", "content": ""}

            for element in doc.texts:
                # Detect if the element is a heading
                if hasattr(element, "label") and element.label in ("title", "section_header"):
                    # Save the previous section if it has content
                    if current["content"].strip():
                        sections.append(
                            PaperSection(
                                title=current["title"],
                                content=current["content"].strip()
                            )
                        )
                    # Start new section
                    current = {"title": element.text.strip(), "content": ""}
                else:
                    if hasattr(element, "text") and element.text:
                        current["content"] += element.text + "\n"

            # Add the final section
            if current["content"].strip():
                sections.append(PaperSection(title=current["title"], content=current["content"].strip()))

            # 2. EXTRACT TABLES
            tables = []
            for idx, t in enumerate(getattr(doc, "tables", []), start=1):
                try:
                    md = t.export_to_markdown(doc=doc)
                except TypeError:
                    md = t.export_to_markdown()

                tables.append(
                    PaperTable(
                        id=str(getattr(t, "uid", None) or f"table_{idx}"),
                        title=getattr(t, "title", None),
                        caption=getattr(t, "caption", None) or "Extracted Table",
                        content=md,
                        metadata={
                            "page": getattr(t, "page_no", None),
                            "bbox": getattr(t, "bbox", None),
                        }
                    )
                )

            # 3. EXTRACT FIGURES
            figures = []
            for idx, f in enumerate(getattr(doc, "figures", []), start=1):
                figures.append(
                    PaperFigure(
                        id=str(getattr(f, "uid", None) or f"fig_{idx}"),
                        caption=getattr(f, "caption", None) or "Extracted Figure"
                    )
                )

            # 4. BUILD FINAL OBJECT
            return PdfContent(
                sections=sections,
                figures=figures,
                tables=tables,
                raw_text=doc.export_to_text(),
                references=[], # References extraction is a complex Docling sub-task
                parser_used=ParserType.DOCLING,
                metadata={
                    "source_file": pdf_path.name,
                    "file_stem": pdf_path.stem,
                    "total_pages": len(doc.pages) if hasattr(doc, "pages") else 0
                },
            )

        except PDFValidationError as e:
            logger.warning(f"Validation skipped {pdf_path.name}: {e}")
            return None
        except Exception as e:
            logger.error(f"DoclingEngine failure on {pdf_path.name}: {e}")
            raise PDFParsingException(f"Failed to parse {pdf_path.name}: {str(e)}")