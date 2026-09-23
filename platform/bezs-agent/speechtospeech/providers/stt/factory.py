from typing import Dict, Any, Type
from .huggingface import HuggingFaceSTTProvider
from .openaiprovider import OpenAISTTProvider
from .sarvam import SarvamSTTProvider

from .streamsarvam import SarvamStreamingSTTProvider


class STTProviderFactory:
    """Factory to handle registration and creation of Speech-to-Text providers."""
    
    _registry: Dict[str, Type] = {
        "huggingface": HuggingFaceSTTProvider,
        "openai": OpenAISTTProvider,
        "sarvam": SarvamSTTProvider,
        "streamsarvam":SarvamStreamingSTTProvider, # Registering the stream provider
    }

    @classmethod
    def register_provider(cls, name: str, provider_class: Type) -> None:
        """Dynamically add new custom providers if needed."""
        cls._registry[name.lower()] = provider_class

    @classmethod
    def create(cls, provider_name: str, **kwargs) -> Any:
        provider_name = provider_name.lower()
        
        if provider_name not in cls._registry:
            raise ValueError(f"Unsupported provider: '{provider_name}'. Available: {list(cls._registry.keys())}")

        provider_class = cls._registry[provider_name]

        # Extract and build args based on provider requirements
        if provider_name == "huggingface":
            return provider_class(
                api_key=kwargs.get("api_key"),
                model=kwargs.get("model", "openai/whisper-large-v3"),
                debug=kwargs.get("debug", False)
            )

        elif provider_name == "openai":
            return provider_class(
                api_key=kwargs.get("api_key"),
                model=kwargs.get("model", "gpt-4o-mini-transcribe")
            )

        elif provider_name == "sarvam":
            return provider_class(
                api_key=kwargs.get("api_key"),
                model=kwargs.get("model", "saaras:v3"),
                language_code=kwargs.get("language", "en-IN"),
            )

        elif provider_name == "streamsarvam":
            return provider_class(
                api_key=kwargs.get("api_key"),
                # Sarvam streaming uses the specialized saaras streaming endpoint models
                model=kwargs.get("model", "saaras:v3:stream"), 
                language_code=kwargs.get("language", "en-IN"),
            )


# Standalone helper function wrapper
def create_stt_provider(provider_name: str, **kwargs):
    return STTProviderFactory.create(provider_name, **kwargs)

# from .huggingface import HuggingFaceSTTProvider
# from .openaiprovider import OpenAISTTProvider
# from .sarvam import SarvamSTTProvider


# def create_stt_provider(provider_name: str, **kwargs):

#     provider_name = provider_name.lower()

#     if provider_name == "huggingface":
#         return HuggingFaceSTTProvider(
           
#             api_key=kwargs.get("api_key"),
#             model=kwargs.get("model", "openai/whisper-large-v3"),
#             #endpoint_url=kwargs.get("endpoint_url"),
#             debug=kwargs.get("debug", False)
#         )

#     elif provider_name == "openai":
#         return OpenAISTTProvider(
#             api_key=kwargs.get("api_key"),
#             model=kwargs.get("model", "gpt-4o-mini-transcribe")
#         )

#     elif provider_name == "sarvam":
#         return SarvamSTTProvider(
#             api_key=kwargs.get("api_key"),
#             model=kwargs.get("model", "saarika:v2.5"),
#             language_code=kwargs.get("language", "en-IN"),
#         )

#     else:
#         raise ValueError(f"Unsupported provider: {provider_name}")