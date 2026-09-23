import requests
import io
import soundfile as sf


class HuggingFaceTTSProvider:

    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model

        self.url = f"https://router.huggingface.co/hf-inference/models/{model}"

        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    def synthesize(self, text: str):

        payload = {"inputs": text}

        response = requests.post(
            self.url,
            headers=self.headers,
            json=payload
        )

        if response.status_code != 200:
            raise RuntimeError(response.text)

        audio_bytes = response.content

        # buffer = io.BytesIO(audio_bytes)
        # audio, sr = sf.read(buffer)

        # return audio, sr
        return audio_bytes