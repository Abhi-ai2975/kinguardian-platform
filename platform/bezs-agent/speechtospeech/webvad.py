import numpy as np
import time

class VoiceActivityDetector:

    def __init__(self, threshold=0.01, silence_duration=0.8):
        self.threshold = threshold
        self.silence_duration = silence_duration
        self.last_speech_time = time.time()

    def is_speech(self, audio_chunk: bytes) -> bool:
        try:
            audio = (
                np.frombuffer(audio_chunk, dtype=np.int16)
                .astype(np.float32) / 32768.0
            )

            energy = np.mean(np.abs(audio))

            if energy > self.threshold:
                self.last_speech_time = time.time()
                return True

            return False

        except Exception:
            return False

    def is_silence_timeout(self) -> bool:
        return (time.time() - self.last_speech_time) > self.silence_duration