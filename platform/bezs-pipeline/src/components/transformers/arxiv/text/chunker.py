import logging
import re
from typing import List, Optional, Dict, Any, Iterator

from ...base import BaseTransformer
from ...schemas import PdfContent, ChunkMetadata, TextChunk, ChunkingConfig

logger = logging.getLogger(__name__)

"""
text_chunker.py
====================================
Purpose:
    Handles the fragmentation of structured PDF content into smaller, 
    overlapping segments. This is optimized for Retrieval-Augmented 
    Generation (RAG) and vector similarity search.
"""

class TextChunker(BaseTransformer):
    """
    Purpose:
        Transformer Layer — Text Chunker.
        Takes structured PdfContent and slices it into smaller, 
        overlapping TextChunks for AI/Vector search.
    """ 

    def __init__(self, data: List[PdfContent], config: Dict[str, Any]):
        """
        Purpose:
            Initializes the chunker with parsed PDF data and validates 
            chunking parameters (size, overlap, and minimum limits).

        Args:
            data (List[PdfContent]): List of parsed PDF content objects.
            config (Dict[str, Any]): Configuration dictionary containing 'chunking' settings.
        """
        super().__init__(config)
        self.parsed_pdfs = data
        
        # Validate chunking settings via Pydantic
        # We look for a 'chunking' key in the main config
        self.chunk_cfg = ChunkingConfig(**config.get("chunking", {}))
        
        self.chunk_size = self.chunk_cfg.chunk_size
        self.overlap_size = self.chunk_cfg.overlap_size
        self.min_chunk_size = self.chunk_cfg.min_chunk_size

        if self.overlap_size >= self.chunk_size:
            raise ValueError("Overlap must be smaller than chunk size")

    def __call__(self) -> Iterator[Dict[str, Any]]:
        """
        Purpose:
            Entry point for the chunking process. Iterates through all PDFs 
            and yields cleaned, indexed chunk records.

        Yields:
            Iterator[Dict[str, Any]]: Dictionary records formatted for Elasticsearch ingestion.
        """
        for pdf in self.parsed_pdfs:
            actual_data = pdf.get("_source", pdf)
            # 1. RE-VALIDATION: Convert Dict back to PdfContent object
            # This allows you to use dot notation (pdf.metadata) again.
            pdf_obj = PdfContent(**actual_data) if isinstance(actual_data, dict) else actual_data
            # 1. Decide if we use section-aware or raw chunking
            chunks = self._chunk_pdf(pdf_obj)
            
            for chunk in chunks:
                # transform() adds the _index and _source needed for Elasticsearch
                yield self.transform(chunk.model_dump())

    def _chunk_pdf(self, pdf: PdfContent) -> List[TextChunk]:
        """
        Purpose:
            Routes the document to the appropriate chunking logic based 
            on whether document sections were successfully identified.

        Args:
            pdf (PdfContent): The structured PDF data.

        Returns:
            List[TextChunk]: A list of generated text chunks.
        """
        # Use generic metadata source if arxiv_id is missing
        source_id = pdf.metadata.get("arxiv_id") or pdf.metadata.get("source_file", "unknown")

        if pdf.sections:
            return self._chunk_by_sections(pdf, source_id)
        
        return self._chunk_raw_text(pdf.raw_text, source_id)

    def _chunk_by_sections(self, pdf: PdfContent, source_id: str) -> List[TextChunk]:
        """
        Purpose:
            Slices text while respecting section headers. Attempts to keep 
            sections together if they fit within limits, or merges small ones.

        Args:
            pdf (PdfContent): The structured PDF data.
            source_id (str): Reference ID for the document.

        Returns:
            List[TextChunk]: Section-aware chunks.
        """
        chunks = []
        buffer = []
        buffer_wc = 0
        idx = 0

        for sec in pdf.sections:
            text = (sec.content or "").strip()
            words = re.findall(r"\S+", text)
            wc = len(words)

            # Case 1: Tiny section -> buffer it to merge with the next one
            if wc < 100:
                buffer.append(text)
                buffer_wc += wc
                continue

            # Flush buffer if we have one before starting this section
            if buffer:
                combined = "\n\n".join(buffer)
                chunks.append(self._build_chunk(combined, idx, source_id, "Combined Intro/Small Sections"))
                idx += 1
                buffer, buffer_wc = [], 0

            # Case 2: Perfect size -> one chunk
            if 100 <= wc <= 800:
                chunks.append(self._build_chunk(text, idx, source_id, sec.title))
                idx += 1
            
            # Case 3: Huge section -> slice with overlap
            else:
                split_chunks = self._chunk_raw_text(text, source_id, idx, sec.title)
                chunks.extend(split_chunks)
                idx += len(split_chunks)

        # Final flush
        if buffer:
            chunks.append(self._build_chunk("\n\n".join(buffer), idx, source_id, "Trailing Sections"))
        
        return chunks

    def _chunk_raw_text(self, text: str, source_id: str, start_idx: int = 0, section_title: str = "Body") -> List[TextChunk]:
        """
        Purpose:
            Sliding window chunking fallback. Used when sections aren't 
            available or a single section is too large.

        Args:
            text (str): Raw string content to chunk.
            source_id (str): Reference ID for the document.
            start_idx (int): Current chunk index offset.
            section_title (str): Title to associate with these chunks.

        Returns:
            List[TextChunk]: Sequential overlapping chunks.
        """
        words = re.findall(r"\S+", text)
        
        if len(words) <= self.min_chunk_size:
            return [self._build_chunk(text, start_idx, source_id, section_title)]

        chunks = []
        pos = 0
        current_idx = start_idx

        while pos < len(words):
            end = min(pos + self.chunk_size, len(words))
            part = " ".join(words[pos:end])
            
            chunks.append(self._build_chunk(part, current_idx, source_id, section_title))
            current_idx += 1
            # Move position forward by (Size - Overlap)
            pos += (self.chunk_size - self.overlap_size)

        return chunks

    def _build_chunk(self, text: str, idx: int, source_id: str, section_title: str) -> TextChunk:
        """
        Purpose:
            Constructs the final validated Pydantic object with complete metadata.

        Args:
            text (str): Content of the chunk.
            idx (int): Global index of the chunk within the document.
            source_id (str): Document ID (e.g., Arxiv ID).
            section_title (str): Contextual title for metadata.

        Returns:
            TextChunk: Validated data model.
        """
        return TextChunk(
            text=text,
            arxiv_id=source_id,
            section_title=section_title,
            metadata=ChunkMetadata(
                chunk_index=idx,
                section_title=section_title,
                word_count=len(text.split()),
                start_char=0, 
                end_char=len(text),
                # Use validated overlap values
                overlap_with_previous=self.overlap_size if idx > 0 else 0,
                overlap_with_next=self.overlap_size
            )
        )