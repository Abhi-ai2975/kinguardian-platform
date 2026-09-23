from pydantic import BaseModel, Field, ConfigDict
from enum import Enum
from typing import List, Dict, Any, Optional

# --- Enums ---
class ParserType(str, Enum):
    DOCLING = "docling"
    PYPDF = "pypdf"

# --- Structural Elements (Extracted from PDF) ---
class PaperSection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str
    content: str

class PaperTable(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    title: Optional[str] = None
    caption: str
    content: str  # This will hold the Markdown table
    metadata: Dict[str, Any]

class PaperFigure(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    caption: str

# --- The Configuration Model (Matches your YAML docling section) ---
class DoclingConfig(BaseModel):
    model_config = ConfigDict(extra="ignore") # Allow extra keys from global config
    max_pages: int
    max_file_size_mb: int
    do_table_structure: bool = False
    do_ocr: bool = False
    max_concurrency: int

# --- The Main Engine Output ---
class PdfContent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    
    # Core PDF content fields
    sections: List[PaperSection]
    figures: List[PaperFigure]
    tables: List[PaperTable]
    raw_text: str
    references: List[str]
    parser_used: ParserType
    metadata: Dict[str, Any]
    
    # Arxiv metadata fields
    title: str
    authors: List[str]
    pdf_url: str
    abstract: str
    arxiv_id: str
    categories: List[str]
    local_pdf_path: str
    published_date: str

# --- Custom Engine Exceptions ---

class ParsingException(Exception):
    """Base exception for parsing-related errors."""

class PDFParsingException(ParsingException):
    """Base exception for PDF parsing-related errors."""

class PDFValidationError(PDFParsingException):
    """Exception raised when PDF file validation fails."""

class PDFDownloadException(Exception):
    """Base exception for PDF download-related errors."""

# --- Chunker Configuration ---
class ChunkingConfig(BaseModel):
    """Matches the 'chunker' block in your YAML."""
    model_config = ConfigDict(extra="ignore")  # Ignores 'index_name' if passed in
    chunk_size: int = 600
    overlap_size: int = 120
    min_chunk_size: int = 150

# --- Chunk Metadata ---
class ChunkMetadata(BaseModel):
    """Detailed tracking for each text segment."""
    model_config = ConfigDict(extra="forbid")
    chunk_index: int
    section_title: str
    word_count: int
    start_char: int
    end_char: int
    overlap_with_previous: int
    overlap_with_next: int

# --- The Final Chunk Object ---
class TextChunk(BaseModel):
    """The final record sent to the transform() method."""
    model_config = ConfigDict(extra="forbid")
    text: str
    arxiv_id: str
    section_title: str
    metadata: ChunkMetadata