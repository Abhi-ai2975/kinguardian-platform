from __future__ import annotations
from typing import Dict, Any, Type
from .openai import OpenAITTSProvider
from .huggingface import HuggingFaceTTSProvider
from .groq import GroqTTSProvider
from .sarvam import SarvamTTSProvider
from .streamsarvam import SarvamStreamingTTSProvider

class TTSProviderFactory:
    """Factory to handle registration and creation of Text-to-Speech providers."""
    
    _registry: Dict[str, Type] = {
        "openai": OpenAITTSProvider,
        "groq": GroqTTSProvider,
        "huggingface":HuggingFaceTTSProvider,
        "sarvam": SarvamTTSProvider,
        "streamsarvam": SarvamStreamingTTSProvider,  # Registered your streaming class!
    }

    @classmethod
    def register_provider(cls, name: str, provider_class: Type) -> None:
        """Dynamically add new custom providers if needed."""
        cls._registry[name.lower()] = provider_class

    @classmethod
    def create(cls, provider_name: str, **kwargs) -> Any:
        provider_name = provider_name.lower()
        
        if provider_name not in cls._registry:
            raise ValueError(f"Unsupported TTS provider: '{provider_name}'. Available: {list(cls._registry.keys())}")

        provider_class = cls._registry[provider_name]

        # Build args based on your specific class constructor parameters
        if provider_name == "streamsarvam":
            return provider_class(
                api_key=kwargs.get("api_key"),
                language_code=kwargs.get("language", "en-IN"),
                speaker=kwargs.get("speaker", "neha"),
                model=kwargs.get("model", "bulbul:v3"),
            )
            
        elif provider_name == "sarvam":
            return provider_class(
                api_key=kwargs.get("api_key"),
                model=kwargs.get("model", "bulbul:v3"),
                language=kwargs.get("language", "en-IN"),
                speaker=kwargs.get("speaker", "neha"),
            )

        elif provider_name == "openai":
            return provider_class(
                api_key=kwargs.get("api_key"),
                model=kwargs.get("model", "gpt-4o-mini-tts"),
            )
        
        elif provider_name == "huggingface":
            return HuggingFaceTTSProvider(
                api_key=kwargs.get("api_key"),
                model=kwargs.get("model")
            )


        elif provider_name == "groq":
            return provider_class(
                api_key=kwargs.get("api_key"),
            )


# Standalone wrapper to match your application configuration patterns
def create_tts_provider(provider_name: str, **kwargs):
    return TTSProviderFactory.create(provider_name, **kwargs)

# def create_tts_provider(provider_name: str, **kwargs):

#     provider_name = provider_name.lower()

#     if provider_name == "openai":
#         return OpenAITTSProvider(
#             api_key=kwargs.get("api_key"),
#             model=kwargs.get("model")
#         )

#     elif provider_name == "huggingface":
#         return HuggingFaceTTSProvider(
#             api_key=kwargs.get("api_key"),
#             model=kwargs.get("model")
#         )

#     elif provider_name == "groq":
#         return GroqTTSProvider(
#             api_key=kwargs.get("api_key"),
#             model=kwargs.get("model"),
#             endpoint_url="https://api.groq.com/openai/v1/audio/speech"
#         )

#     elif provider_name == "sarvam":
#         return SarvamTTSProvider(
#             api_key=kwargs.get("api_key"),
#             target_language_code=kwargs.get("language", "en-IN"),
#             speaker=kwargs.get("speaker", "anushka"),
#         )

#     else:
#         raise ValueError(f"Unsupported TTS provider: {provider_name}")