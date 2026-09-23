import requests
import io
import soundfile as sf


class OpenAITTSProvider:

    def __init__(self, api_key: str, model="gpt-4o-mini-tts", voice="alloy"):

        self.api_key = api_key
        self.model = model
        self.voice = voice

        self.url = "https://api.openai.com/v1/audio/speech"

        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    def synthesize(self, text):

        payload = {
            "model": self.model,
            "input": text,
            "voice": self.voice,
            "response_format": "wav"
        }

        response = requests.post(
            self.url,
            headers=self.headers,
            json=payload
        )

        if response.status_code != 200:
            raise RuntimeError(response.text)

        # buffer = io.BytesIO(response.content)
        # audio, sr = sf.read(buffer)

        # return audio, sr
        return response.content