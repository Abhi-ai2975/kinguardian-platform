from __future__ import annotations
from enum import Enum
import os
from pathlib import Path
from typing import Any
from pydantic import BaseModel, Field, model_validator
from speechtospeech.providers.stt.factory import create_stt_provider
from speechtospeech.providers.tts.factory import create_tts_provider
from speechtospeech.audioprocessor import AudioProcessor
from speechtospeech.speechtotext.sttengine import TranscriptionEngine
from speechtospeech.texttospeech.ttsengine import TTSEngine
from dotenv import load_dotenv
load_dotenv()

class ModelConfig(BaseModel):
    name: str = "gpt-4.1" #"gpt-4o-mini" #"mistralai/devstral-2512:free"
    temperature: float = Field(default=1, ge=0.0, le=2.0)
    context_window: int = 256_000

class ShellEnvironmentPolicy(BaseModel):
    ignore_default_excludes: bool = False
    exclude_patterns: list[str] = Field(
        default_factory=lambda: ["*KEY*", "*TOKEN*", "*SECRET*"]
    )
    set_vars: dict[str, str] = Field(default_factory=dict)

class MCPServerConfig(BaseModel):
    enabled: bool = True
    startup_timeout_sec: float = 10

    # stdio transport
    command: str | None = None
    args: list[str] = Field(default_factory=list)
    env: dict[str, str] = Field(default_factory=dict)
    cwd: Path | None = None
    headers: dict[str, str] = Field(default_factory=dict)

    # http/sse transport
    url: str | None = None
    transport: str = "streamable-http"

    @model_validator(mode="after")
    def validate_transport(self) -> MCPServerConfig:
        has_command = self.command is not None
        has_url = self.url is not None

        if not has_command and not has_url:
            raise ValueError(
                "MCP Server must have either 'command' (stdio) or 'url' (http/sse)"
            )

        if has_command and has_url:
            raise ValueError(
                "MCP Server cannot have both 'command' (stdio) and 'url' (http/sse)"
            )

        return self


class ApprovalPolicy(str, Enum):
    ON_REQUEST = "on-request"
    ON_FAILURE = "on-failure"
    AUTO = "auto"
    AUTO_EDIT = "auto-edit"
    NEVER = "never"
    YOLO = "yolo"


class HookTrigger(str, Enum):
    BEFORE_AGENT = "before_agent"
    AFTER_AGENT = "after_agent"
    BEFORE_TOOL = "before_tool"
    AFTER_TOOL = "after_tool"
    ON_ERROR = "on_error"


class HookConfig(BaseModel):
    name: str
    trigger: HookTrigger
    command: str | None = None  # python3 tests.py
    script: str | None = None  # *.sh
    timeout_sec: float = 30
    enabled: bool = True

    @model_validator(mode="after")
    def validate_hook(self) -> HookConfig:
        if not self.command and not self.script:
            raise ValueError("Hook must either have 'command' or 'script'")
        return self

class Config(BaseModel):
    
    model: ModelConfig = Field(default_factory=ModelConfig)
    cwd: Path = Field(default_factory=Path.cwd)
    shell_environment: ShellEnvironmentPolicy = Field(
        default_factory=ShellEnvironmentPolicy
    )
    hooks_enabled: bool = False
    hooks: list[HookConfig] = Field(default_factory=list)
    approval: ApprovalPolicy = ApprovalPolicy.AUTO_EDIT   # approval: ApprovalPolicy = ApprovalPolicy.ON_REQUEST
    max_turns: int = 100
    mcp_servers: dict[str, MCPServerConfig] = Field(default_factory=dict)

    allowed_tools: list[str] | None = Field(
        None,
        description="If set, only these tools will be available to the agent",
    )

    developer_instructions: str | None = None
    user_instructions: str | None = None

    debug: bool = False

    @property
    def api_key(self) -> str | None:
        return os.environ.get("API_KEY")

    @property
    def base_url(self) -> str | None:
        return os.environ.get("BASE_URL")

    @property
    def model_name(self) -> str:
        return self.model.name

    @model_name.setter
    def model_name(self, value: str) -> None:
        self.model.name = value

    @property
    def temperature(self) -> float:
        return self.model.temperature

    # @model_name.setter
    # def temperature(self, value: str) -> None:
    #     self.model.temperature = value

    @temperature.setter
    def temperature(self, value: float) -> None:
        self.model.temperature = value

    def validate(self) -> list[str]:
        errors: list[str] = []

        if not self.api_key:
            errors.append("No API key found. Set API_KEY environment variable")

        if not self.cwd.exists():
            errors.append(f"Working directory does not exist: {self.cwd}")

        return errors

    
    @property
    def iam_jwks_url(self):
        return os.environ.get("IAM_JWKS_URL")

    @property
    def iam_issuer(self):
        return os.environ.get("IAM_ISSUER")

    @property
    def mcp_servers_config(self) -> dict[str, MCPServerConfig]:
        base_url = self.fhir_base_url
        if not base_url:
            return {}
        return {
            "fhir": MCPServerConfig(
                url=base_url,
                enabled=True,
                transport="streamable-http",
            )
        }
        
    @property
    def fhir_base_url(self):
        return os.environ.get("FHIR_BASE_URL")
    
    @property
    def mlflow_enabled(self) -> bool:
        return os.environ.get("MLFLOW_ENABLED", "false").lower() == "true"

    @property
    def mlflow_tracking_uri(self) -> str:
        return os.environ.get("MLFLOW_TRACKING_URI", "http://localhost:5000")

    @property
    def mlflow_experiment_name(self) -> str:
        return os.environ.get("MLFLOW_EXPERIMENT_NAME")
    
    
    @property
    def vad_enabled(self):
        return os.environ.get("VAD_ENABLED", "true") == "true"
    
    @property
    def sarvam_api_key(self):
        return os.environ.get("SARVAM_API_KEY")
    
    @property
    def sarvam_stt_model(self):
        return os.environ.get(
            "SARVAM_STT_MODEL",
            "saaras:v3"
        )

    @property
    def sarvam_tts_model(self):
        return os.environ.get(
            "SARVAM_TTS_MODEL",
            "bulbul:v3"
        )

    @property
    def sarvam_speaker(self):
        return os.environ.get(
            "SARVAM_SPEAKER",
            "neha"
        )

    @property
    def stt_engine(self):

        if not hasattr(self, "_stt_engine") or self._stt_engine is None:

            api_key = self.openai_api_key
            if self.stt_provider == "huggingface":
                api_key = self.hf_api_key
            elif self.stt_provider == "sarvam":
                api_key = self.sarvam_api_key

            provider = create_stt_provider(
                self.stt_provider,
                api_key=api_key,
                model=self.stt_model,
                endpoint_url=self.stt_endpoint,
                language=self.stt_language,
                debug=self.debug
            )

            processor = AudioProcessor(target_rate=self.stt_sample_rate)

            self._stt_engine = TranscriptionEngine(provider, processor)

        return self._stt_engine

    @property
    def hf_api_key(self):
        return os.environ.get("HF_API_KEY")

    @property
    def openai_api_key(self):
        return os.environ.get("API_KEY")
    
    @property
    def stt_provider(self) -> str:
        return os.environ.get("STT_PROVIDER", "huggingface")

    @property
    def stt_model(self) -> str:
        return os.environ.get("STT_MODEL", "openai/whisper-large-v3")

    @property
    def stt_endpoint(self) -> str | None:
        return os.environ.get("STT_ENDPOINT")

    @property
    def stt_sample_rate(self) -> int:
        return int(os.environ.get("STT_SAMPLE_RATE", "16000"))
    
    @property
    def stt_language(self) -> str:
        return os.environ.get("STT_LANGUAGE", "en")
    
    # TTS CONFIG
# --------------------------------------------------

    @property
    def tts_provider(self):
        return os.environ.get("TTS_PROVIDER", "openai")

    @property
    def tts_model(self):
        return os.environ.get("TTS_MODEL", "gpt-4o-mini-tts")

    @property
    def tts_endpoint(self):
        return os.environ.get("TTS_ENDPOINT")

    @property
    def tts_sample_rate(self):
        return int(os.environ.get("TTS_SAMPLE_RATE", "22050"))

    @property
    def groq_api_key(self):
        return os.environ.get("GROQ_API_KEY")

    @property
    def tts_language(self):
        return os.environ.get("TTS_LANGUAGE", "en-IN")

    @property
    def tts_speaker(self):
        return os.environ.get("TTS_SPEAKER", "anushka")

    @property
    @property
    def tts_engine(self):

        if not hasattr(self, "_tts_engine"):

            api_key = self.openai_api_key
            if self.tts_provider == "groq":
                api_key = self.groq_api_key
            elif self.tts_provider == "sarvam":
                api_key = self.sarvam_api_key

            provider = create_tts_provider(
                self.tts_provider,
                api_key=api_key,
                model=self.tts_model,
                endpoint_url=self.tts_endpoint,
                language=self.tts_language,
                speaker=self.tts_speaker,
            )

            processor = AudioProcessor(target_rate=self.tts_sample_rate)

            self._tts_engine = TTSEngine(provider, processor)

        return self._tts_engine

        
    def to_dict(self) -> dict[str, Any]:
        return self.model_dump(mode="json")
