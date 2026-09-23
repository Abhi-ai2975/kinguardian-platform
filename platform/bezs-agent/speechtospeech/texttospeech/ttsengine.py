import numpy as np

class TTSEngine:

    def __init__(self, provider, processor):
        self.provider = provider
        self.processor = processor

    def synthesize(self, text: str):

        if not text.strip():
            raise ValueError("Empty text")

        audio_bytes = self.provider.synthesize(text)

        audio, sr = self.processor.bytes_to_array(audio_bytes)

        return audio, sr