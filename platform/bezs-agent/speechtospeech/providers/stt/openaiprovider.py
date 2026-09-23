import requests

class OpenAISTTProvider:
    """
    OpenAI Whisper / audio transcription provider
    Uses multipart/form-data (correct format)
    """

    def __init__(self, api_key: str, model: str = "gpt-4o-mini-transcribe"):
        self.api_key = api_key
        self.model = model
        self.url = "https://api.openai.com/v1/audio/transcriptions"

        self.headers = {
            "Authorization": f"Bearer {self.api_key}"
        }
        self.debug = True

    def transcribe(self, audio_bytes: bytes) -> str:

        if self.debug:
            print(f"[STT] Sending {len(audio_bytes)} bytes")

        files = {
            "file": ("audio.wav", audio_bytes, "audio/wav")
        }

        data = {
            "model": self.model,
            "language": "en",  # Force English-only transcription
            "temperature": 0
        }


        try:
            response = requests.post(
                self.url,
                headers=self.headers,
                files=files,
                data=data,
                timeout=30
            )
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"[NETWORK ERROR] {str(e)}")

        if response.status_code != 200:
            raise RuntimeError(
                f"[OpenAI STT ERROR] {response.status_code}: {response.text}"
            )

        result = response.json()
        text = result.get("text", "")

        if not text:
            return ""

        return text.strip()

    def transcribe_chunk(self, audio_bytes: bytes) -> str:
        return self.transcribe(audio_bytes)

    