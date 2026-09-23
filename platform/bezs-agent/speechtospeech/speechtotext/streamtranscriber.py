import asyncio
import tempfile
import os

class StreamTranscriber:

    def __init__(self, engine):
        self.engine = engine
        self.buffer = []
        self.silence_count = 0

    async def process_chunk(self, chunk, rate):

        # processed = self.engine.processor.process(chunk, rate)
        audio_bytes = self.engine.prepare_audio(chunk, rate)

        try:
            text = await self._transcribe(audio_bytes)
        except Exception as e:
            print("STT error:", e)
            return None


        if text and text.strip():
            self.silence_count = 0
            self.buffer.append(text)
            print("Partial:", text)

        else:
            self.silence_count += 1

        # silence detection
        if self.silence_count > 3:
            final_text = " ".join(self.buffer)
            self.buffer = []
            self.silence_count = 0

            return final_text

        return None

    async def _transcribe(self, wav_bytes: bytes) -> str:
        provider = self.engine.provider
        if asyncio.iscoroutinefunction(provider.transcribe):
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(wav_bytes)
                tmp_path = f.name
            try:
                return await provider.transcribe(tmp_path)
            finally:
                os.unlink(tmp_path)
        else:
            return await asyncio.to_thread(provider.transcribe, wav_bytes)
