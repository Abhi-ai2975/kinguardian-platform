# import soundfile as sf
# from config.config import Config

# # load config
# config = Config()

# # get tts engine
# tts = config.tts_engine

# text = "Hello Alees, your text to speech system is working da."

# # synthesize speech
# audio, sr = tts.synthesize(text)

# print("Sample rate:", sr)
# print("Audio length:", len(audio))

# # save output
# sf.write("tts_output.wav", audio, sr)

# print("Audio saved to tts_output.wav")

import webrtcvad

vad = webrtcvad.Vad(2)
print("WebRTC VAD working!")