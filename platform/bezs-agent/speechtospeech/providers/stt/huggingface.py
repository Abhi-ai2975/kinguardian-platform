
import requests
import base64

class HuggingFaceSTTProvider:

    def __init__(self, api_key: str, model: str =  "openai/whisper-large-v3", endpoint_url: str | None = None, debug=False):
        self.api_key = api_key
        self.model = model
        self.debug = debug

        print("HF API KEY RECEIVED:", api_key)

        # Use HF router (IMPORTANT)
        self.url = (
            endpoint_url
            if endpoint_url
            else f"https://router.huggingface.co/hf-inference/models/{self.model}"
        )

        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "audio/wav",
            "Accept": "application/json"
        }

    def transcribe(self, audio_bytes: bytes) -> str:

        if self.debug:
            print(f"[HF STT] Model={self.model} Bytes={len(audio_bytes)}")

        # encode audio
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

        payload = {
            "inputs": audio_base64,
            "parameters": {
                "task": "transcribe",
                "language": "en"   # FORCE LANGUAGE HERE
            }
        }
        try:
            response = requests.post(
                self.url,
                headers=self.headers,
                data=audio_bytes,
                timeout=30
            )
        except requests.exceptions.RequestException as e:
            raise RuntimeError(f"[HF NETWORK ERROR] {str(e)}")

        if response.status_code != 200:
            raise RuntimeError(
                f"[HF STT ERROR]\n"
                f"Status: {response.status_code}\n"
                f"Response: {response.text}"
            )

        result = response.json()

        # # safer parsing
        # if isinstance(result, dict):
        #     text = result.get("text", "")
        # else:
        #     text = ""

        # return text.strip()

        if isinstance(result, dict) and "error" in result:
            raise RuntimeError(f"[HF MODEL ERROR] {result['error']}")

        text = result.get("text", "") if isinstance(result, dict) else ""

        text = text.strip()

        if len(text) < 2:
            return ""

        return text
    
    def transcribe_chunk(self, audio_bytes: bytes) -> str:
        return self.transcribe(audio_bytes)
