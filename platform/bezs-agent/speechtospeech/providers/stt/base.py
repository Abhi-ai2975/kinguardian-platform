from abc import ABC, abstractmethod


class BaseSTTProvider(ABC):

    @abstractmethod
    async def transcribe(self, audio_file: str) -> str:
        pass