
import soundfile as sf
from config.config import Config

# load config
config = Config()

# load your STT engine
engine = config.stt_engine

# read recorded audio
audio, rate = sf.read(r"/home/kipla/aiagent/ai-coding-agent/test/output.wav")

print("Audio shape:", audio.shape)
print("Sample rate:", rate)

# process audio
processed = engine.processor.process(audio, rate)

# convert to bytes
audio_bytes = engine.processor.to_bytes(processed)

# send to STT
text = engine.provider.transcribe(audio_bytes)

print("\nTranscription:")
print(text)