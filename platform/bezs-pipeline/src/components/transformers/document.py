import logging
from typing import Dict, Any, Iterator, List




from .base import BaseTransformer
from .schemas import DocumentTransformerConfig, TransformerInputRecord, TransformerOutputChunk

logger = logging.getLogger(__name__)

"""
document.py
====================================
Purpose:
    Handles unstructured data (like Gmail body text) by extracting clean text 
    and automatically segmenting it into searchable chunks using txtai.
"""

class DocumentTransformer(BaseTransformer):
    """
    Purpose: 
        A specialized transformer for processing unstructured text documents.
        It performs both text extraction and logical segmentation (chunking).
    """
    def __init__(self, data: Any, config: Dict[str, Any]):
        """
        Purpose: Initializes the transformer and the txtai Textractor pipeline.
        
        Args:
            data (Any): Raw record or list of records (e.g., extracted Gmail data).
            config (Dict[str, Any]): Config containing 'textractor' and 'segmentation' settings.
        """
        self.transformer_config = DocumentTransformerConfig(**config)
        super().__init__(config)
        # 1. Module-level Conditional Import
        try:
            from txtai.pipeline.data import Textractor
            TXTAI_AVAILABLE = True
        except ImportError:
            TXTAI_AVAILABLE = False
        
        if not TXTAI_AVAILABLE:
            raise ImportError("txtai is required for DocumentTransformer. Install it with 'pip install txtai'.")
        
        self.data = data        
        logger.info("Initializing txtai Textractor for document segmentation.")
        self.textractor = Textractor(
            **self.transformer_config.textractor,
            **self.transformer_config.segmentation
        )

    def __call__(self) -> Iterator[Dict[str, Any]]:
        """
        Purpose: Executes transformation and segmentation for all records.
        
        Returns:
            Iterator[Dict[str, Any]]: A generator yielding individual chunks 
                                      formatted for the Loader.
        """
        raw_records = self.data if isinstance(self.data, list) else [self.data]
        logger.info(f"Starting document transformation for {len(raw_records)} records.")
        
        for raw_record in raw_records:
            # Strict validation of input record
            record = TransformerInputRecord(**raw_record)

            # Create a list of things to process (text + paths)
            to_process = []     # list becomes list of strings [text, path1, path2]
            if record.body:
                to_process.append(record.body)
            
            # Add all file paths to the list
            to_process.extend(record.attachments)

            if not to_process:
                logger.warning(f"Record {record.id} has an empty body. Skipping.")
                continue
                
            # Automatic Extraction & Segmentation
            chunks = self.textractor(to_process)
            
            for i, chunk in enumerate(chunks):
                # FIX: If txtai returns a list for a single segment, join it
                clean_text = " ".join(chunk) if isinstance(chunk, list) else chunk
                
                chunk_dict = TransformerOutputChunk(
                    id=f"{record.id}#chunk{i}",
                    text=clean_text,
                    source_id=record.source_id,
                    source=record.source,
                    metadata=record.metadata
                )

                yield self.transform(chunk_dict.model_dump())