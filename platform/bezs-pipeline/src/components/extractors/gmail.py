import logging
import base64
from pathlib import Path
from typing import Dict, Any, List, Iterator
from .base import BaseExtractor
from .schemas import GmailExtractorConfig

logger = logging.getLogger(__name__)

"""
gmail.py
====================================
Purpose:
    Handles extraction and normalization of email data from the Gmail API.
"""

class GmailExtractor(BaseExtractor):
    """
    Purpose: 
        Extracts and normalizes email data. Acts as an iterator to 
        handle memory-efficient processing of large batches.
    """

    def __init__(self, connection: Any, config: Dict[str, Any]):
        """
        Purpose: Initializes the Gmail extractor and identifies the source account.

        Args:
            connection (Any): Authenticated Gmail API service object.
            config (Dict[str, Any]): Configuration for 'query', 'batch_size', etc.
        """
        self.service = connection
        self.config = GmailExtractorConfig(**config)
        
        # Identify the email address associated with the token
        profile = self.service.users().getProfile(userId='me').execute()
        self.source_id = profile.get('emailAddress', 'unknown_account')
        logger.info(f"GmailExtractor initialized for account: {self.source_id}")

    def __call__(self) -> Iterator[Dict[str, Any]]:
        """
        Purpose: Call the instance to begin extraction.
        
        Returns:
            Iterator[Dict[str, Any]]: Generator of normalized email records.
        """
        return self.extract()

    def extract(self) -> Iterator[Dict[str, Any]]:
        """
        Purpose: Coordinates fetching message IDs and yielding normalized data.

        Yields:
            Dict[str, Any]: A single normalized email record.
        """
        logger.info(f"Starting Gmail extraction with query: {self.config.query}")
        message_ids = self._get_message_ids()

        for msg_id in message_ids:
            try:
                raw_msg = self.service.users().messages().get(
                    userId='me', 
                    id=msg_id, 
                    format=self.config.extraction_mode
                ).execute()

                yield self._normalize_message(raw_msg)
            except Exception as e:
                logger.error(f"Failed to extract message {msg_id}: {e}")
                continue
        
    def _get_message_ids(self) -> List[str]:
        """
        Purpose: Searches Gmail for IDs matching the config query.

        Returns:
            List[str]: List of message IDs.
        """
        query = self.config.query
        batch_size = self.config.batch_size

        # NEW: date-based filtering
        if self.config.start_date:
           query += f" after:{self.config.start_date.replace('-', '/')}"

        if self.config.end_date:
           query += f" before:{self.config.end_date.replace('-', '/')}"

        logger.info(f"Gmail final query: {query}")

        result = self.service.users().messages().list(
            userId='me',
            q=query,
            maxResults=batch_size
        ).execute()
        
        messages = result.get("messages", [])
        return [m["id"] for m in messages]

    def _handle_attachments(self, msg_id: str, payload: Dict[str, Any]) -> List[str]:
        """
        Purpose: 
            Iterates through email parts, downloads files, and saves them locally.
        """
        file_paths = []
        parts = payload.get('parts', [])
        
         # Decide base directory(config-driven)
        if self.config.temp_dir:
            base_dir = Path(self.config.temp_dir)
        else:
            #safe default (projec-local, not /tmp)
            base_dir = Path.cwd() / ".tmp" / "gmail" / "attachments"

        # Define relative path using Pathlib
        #base_path = Path("/tmp/aiplatform/gmail/extractors") / msg_id
        base_path = base_dir / msg_id
        logger.info(f"Gmail attachment storage path: {base_path.absolute()}")
        base_path.mkdir(parents=True, exist_ok=True)

        for part in parts:
            filename = part.get('filename')
            body = part.get('body', {})
            attachment_id = body.get('attachmentId')

            # If it has a filename and an ID, it's an actual file
            if filename and attachment_id:
                logger.info(f"Downloading attachment: {filename} for message {msg_id}")
                
                # Fetch the actual file bytes from Gmail
                attachment = self.service.users().messages().attachments().get(
                    userId='me', messageId=msg_id, id=attachment_id
                ).execute()
                
                # Decode the base64 string into raw binary data
                file_data = base64.urlsafe_b64decode(attachment['data'])
                
                # Define the final file location
                target_file = base_path / filename
                
                # Write the binary data to disk
                with open(target_file, 'wb') as f:
                    f.write(file_data)
                
                # Add the string version of the path to our list
                file_paths.append(str(target_file))
                
        return file_paths

    def _normalize_message(self, raw_msg: Dict[str, Any]) -> Dict[str, Any]:
        """
        Purpose: Flattens raw API JSON into a standard schema.

        Args:
            raw_msg (Dict[str, Any]): Raw JSON from Google.

        Returns:
            Dict[str, Any]: Normalized dictionary.
        """
        msg_id = raw_msg.get('id')
        payload = raw_msg.get('payload', {})
        headers = payload.get('headers', [])
        allowed_headers = self.config.fields
        
        """ 
        from this,
        [
            {"name": "Subject", "value": "Hello World"},
        ] 
        to this,
        {
            "subject": "Hello World",
        }"""
        metadata = {
            h.get('name', '').lower(): h.get('value') 
            for h in headers 
            if h.get('name', '').lower() in allowed_headers
        }

        # 1. Extract the text body
        body_text = self._extract_body(payload)
        
        # 2. Download attachments and get their local paths
        attachment_paths = self._handle_attachments(msg_id, payload)
        
        return {
            "id": msg_id,
            "source": "gmail",
            "source_id": self.source_id,
            "metadata": metadata,
            "body": body_text.strip() if body_text else "",
            "attachments": attachment_paths  
        }

    def _extract_body(self, payload: Dict[str, Any]) -> str:
        """
        Purpose: Recursively decodes base64 body content.

        Args:
            payload (Dict[str, Any]): Gmail payload part.

        Returns:
            str: Decoded body string.
        """
        if 'data' in payload.get('body', {}):
            return base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8')
        
        if 'parts' in payload:
            for part in payload['parts']:
                body = self._extract_body(part)
                if body:
                    return body
        return ""