import logging
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Union, Optional

from ...base import BaseTransformer
from .engine import DoclingEngine  
from ...schemas import PdfContent, DoclingConfig, PDFValidationError

logger = logging.getLogger(__name__)

"""
pdf_transformer.py
====================================
Purpose:
    Acts as the high-level orchestrator for PDF processing. It manages 
    asynchronous concurrency, delegates parsing to the DoclingEngine, 
    and wraps the resulting structured data into index-ready formats.
"""

class PDFTransformer(BaseTransformer):
    """
    Purpose:
        Generic PDF Transformer Entry Point.
        Transforms local PDF files into standardized, index-ready records
        by delegating low-level parsing to DoclingEngine.
    """

    def __init__(self, data: List[Any], config: Dict[str, Any]):
        """
        Purpose:
            Initializes the transformer with a list of file paths and 
            configuration for the underlying parsing engine.

        Args:
            data (List[Any]): List of PDF file paths to process.
            config (Dict): Contains 'index_name' and 'docling' sub-config.
        """
        # Initialize BaseTransformer (handles index_name and basic cleaning)
        super().__init__(config)
        
        self.pdf_paths = data
        # Use the config directly (DAG already extracted the docling section)
        docling_dict = config
        
        # This validates everything (concurrency, ocr, etc.)
        self.docling_config = DoclingConfig(**docling_dict)
        
        self.engine = DoclingEngine(docling_dict)
        self.semaphore = asyncio.Semaphore(self.docling_config.max_concurrency)
    
    async def __call__(self) -> List[Dict[str, Any]]:
        """
        Purpose:
            Triggers the async transformation process and returns 
            standardized records for all provided PDFs.

        Returns:
            List[Dict[str, Any]]: A list of formatted records ready for Elasticsearch/OpenSearch.
        """
        if not self.pdf_paths:
            logger.warning("PdfTransformer received empty path list.")
            return []

        logger.info(f"Starting PDF transformation: {len(self.pdf_paths)} files")
        
        # Create tasks for parallel processing
        tasks = [self._process_single_pdf(p) for p in self.pdf_paths]
        
        # Gather results
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        final_records = []
        for res in results:
            if isinstance(res, dict):
                final_records.append(res)
            elif isinstance(res, Exception):
                logger.error(f"Transformation task failed: {res}")
                
        return final_records

    async def _process_single_pdf(self, pdf_input: Union[Path, Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Purpose:
            Internal workflow for a single PDF:
            Validate -> Parse -> Standardize -> Format for Indexing.

        Args:
            pdf_input (Union[Path, Dict[str, Any]]): Path to the single PDF file to process.

        Returns:
            Optional[Dict[str, Any]]: Standardized index record or None if processing failed.
        """
        # Logic: If it's a dict, get the path. If it's a Path, use it.
        if isinstance(pdf_input, dict):
            path_str = pdf_input.get("local_pdf_path")
            pdf_path = Path(path_str) if path_str else None
            metadata = pdf_input # Keep the rest for later
        else:
            pdf_path = pdf_input
            metadata = {}
        
        if not pdf_path or not pdf_path.exists():
            logger.error(f"File not found: {pdf_path}")
            return None

        async with self.semaphore:
            try:
                # Parse PDF into structured Pydantic model
                content: Optional[PdfContent] = await self.engine.parse_pdf(pdf_path)
                
                if not content:
                    return None

                # Convert model to dict for cleaning
                raw_dict = content.model_dump()

                # Merge the original Arxiv metadata with the new PDF text
                # This ensures Title and Authors stay with the Chunks
                combined_data = {**metadata, **raw_dict}
                
                return self.transform(combined_data)

            except PDFValidationError as e:
                logger.warning(f"Validation failed for {pdf_path.name}: {e}")
                return None
            except Exception as e:
                logger.error(f"Unexpected error transforming {pdf_path.name}: {e}")
                return None