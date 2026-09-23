from abc import ABC, abstractmethod


class BaseTTSProvider(ABC):

    @abstractmethod
    async def synthesize(
        self,
        text: str,
        output_file: str,
    ) -> str:
        pass