import requests
import io
import soundfile as sf


class GroqTTSProvider:

    def __init__(self, api_key: str,  endpoint_url: str, model: str = "canopylabs/orpheus-v1-english", voice="autumn"):
        self.api_key = api_key
        self.model = model
        self.voice = voice

        self.url = f"{endpoint_url}/audio/speech"

        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    def synthesize(self, text: str):

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

        audio_bytes = response.content

        buffer = io.BytesIO(audio_bytes)
        audio, sr = sf.read(buffer)

        return audio, sr