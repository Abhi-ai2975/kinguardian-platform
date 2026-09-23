import logging
import yaml
import pickle
import json
from pathlib import Path
from typing import Any, Dict, Union

logger = logging.getLogger(__name__)

"""
utils.py
====================================
Purpose:
    Provides utility functions for file handling, including loading configuration 
    files (YAML) and serialized data (Pickle/JSON).
"""

def load_yml(file_path: Union[str, Path]) -> Dict[str, Any]:
    """
    Purpose:
        Reads and parses a YAML configuration file.

    Args:
        file_path (str): The system path to the .yml or .yaml file.

    Returns:
        Dict[str, Any]: The parsed configuration dictionary.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the file is not a YAML or parsing fails.
    """
    path = Path(file_path)

    if not path.exists():
        error_msg = f"Configuration file not found: {path.absolute()}"
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)

    if path.suffix not in ['.yml', '.yaml']:
        error_msg = f"File {path.name} is not a valid YAML file."
        logger.error(error_msg)
        raise ValueError(error_msg)

    try:
        with path.open('r') as f:
            logger.info(f"Loading YAML configuration from: {path.name}")
            return yaml.safe_load(f)
    except yaml.YAMLError as e:
        error_msg = f"Error parsing YAML file {path.name}: {e}"
        logger.exception(error_msg)
        raise ValueError(error_msg)


def load_pickle(file_path: str) -> Dict[str, Any]:
    """
    Purpose:
        Loads serialized data from a pickle file. If the file is not a 
        pickle, it attempts to fall back to JSON. Specially handles 
        Google Credential objects by converting them to JSON strings.

    Args:
        file_path (str): The system path to the serialized file.

    Returns:
        Dict[str, Any]: The deserialized data as a dictionary.

    Raises:
        FileNotFoundError: If the file does not exist.
    """
    path = Path(file_path)
    if not path.exists():
        error_msg = f"File not found: {path.absolute()}"
        logger.error(error_msg)
        raise FileNotFoundError(error_msg)

    logger.info(f"Attempting to load serialized data from: {path.name}")

    with path.open('rb') as f:
        # Check first byte to identify if it is a pickle file
        header = f.read(1)
        f.seek(0)
        
        if header == b'\x80':
            logger.debug("Pickle header detected. Deserializing...")
            data = pickle.load(f)
            
            # Specialized handling for Google OAuth2 Credentials
            if hasattr(data, 'to_json'):
                logger.debug("Google Credential object detected; converting to JSON.")
                return json.loads(data.to_json())
            return data
        else:
            logger.warning("No pickle header found. Falling back to JSON parsing.")
            return json.loads(path.read_text())