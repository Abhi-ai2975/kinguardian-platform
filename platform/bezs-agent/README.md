# bezs-agent

A multi-agent clinical voice system: streaming speech-to-text, speaker diarization, LLM-driven clinical agents (intake, consult, EHR, report generation), and text-to-speech, wired together over a FastAPI HTTP/WebSocket backend with MLflow tracking.

## Features

- **Clinical agents** — intake, consult, previsit, doctor-assistant, EHR, and report agents built on a shared `Agent` runtime with tool calling
- **Speech-to-speech pipeline** — streaming STT, VAD, diarization (hybrid streaming + batch), and TTS
- **Tool system** — built-in tools plus MCP (Model Context Protocol) server support and subagents
- **Context management** — automatic compaction and loop detection to keep long clinical sessions within model limits
- **Session persistence** — resumable sessions and checkpoints
- **Safety** — configurable approval policies for tool execution (on-request, auto, never, yolo) and dangerous-command detection
- **Observability** — MLflow experiment tracking for agent runs
- **Auth** — JWT-based auth (bearer header or query param) for HTTP and WebSocket endpoints, validated against a configurable IAM JWKS URL

## Project Structure

```
.
├── agent/           # Core agent runtime (session, events, persistence)
├── api/             # FastAPI app, HTTP routers, WebSocket routers
├── client/          # LLM client abstraction
├── config/          # Pydantic-based configuration
├── context/         # Context window compaction + loop detection
├── customagents/    # Clinical agent implementations (intake, consult, ehr, report, ...)
├── prompts/         # System prompts
├── safety/          # Tool-approval policies
├── speechtospeech/  # STT/TTS providers, VAD, diarization pipeline
├── tools/           # Built-in tools, MCP integration, subagents
├── ui/              # Terminal UI
├── utils/           # SOAP parsing/reporting, patient storage, etc.
└── test/            # Test pages and manual check scripts
```

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (installed automatically if missing)

## Quick Start

```bash
git clone https://github.com/Yazhnimalan/bezs-agent.git
cd bezs-agent

uv venv
uv pip install -e .

cp .env.example .env
# edit .env with your API keys — see Configuration below

uvicorn api.main:app --host 0.0.0.0 --port 8000
```

## Configuration

All configuration is via environment variables — copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `API_KEY` | yes | LLM provider API key |
| `MODEL_NAME` / `BASE_URL` | no | Model + endpoint (defaults to OpenAI `gpt-4.1`) |
| `SARVAM_API_KEY` | for voice | Sarvam STT/TTS API key |
| `STT_PROVIDER`, `STT_LANGUAGE` | no | Speech-to-text provider settings |
| `TTS_PROVIDER`, `TTS_LANGUAGE`, `SARVAM_SPEAKER` | no | Text-to-speech provider settings |
| `VAD_ENABLED` | no | Toggle voice activity detection |
| `MLFLOW_ENABLED`, `MLFLOW_TRACKING_URI`, `MLFLOW_EXPERIMENT_NAME` | no | Experiment tracking |
| `FHIR_BASE_URL` | for EHR agent | FHIR server base URL |
| `IAM_JWKS_URL`, `IAM_ISSUER` | for auth | JWT validation |

Never commit a real `.env` file — it's gitignored by default.

## API Endpoints

| Path | Type | Description |
|------|------|-------------|
| `/health` | GET | Health check |
| `/api/agent` | HTTP | General agent endpoint |
| `/api/consult` | HTTP | Consult agent endpoint |
| `/api/ehr` | HTTP | EHR agent endpoint |
| `/ws/audio/intake` | WebSocket | Voice intake (speech-to-speech) |
| `/ws/audio/consult` | WebSocket | Voice consult (speech-to-speech) |
| `/ws/diarize` | WebSocket | Hybrid diarization |

## Adding a New Agent

Agents follow a 2-file convention:

```python
# customagents/myagent/myprompt.py
MY_PROMPT = """You are the MyAgent..."""

# customagents/myagent/myagent.py
from agent.agent import Agent
from agent.events import AgentType
from customagents.myagent.myprompt import MY_PROMPT

class MyAgent(Agent):
    def __init__(self, config, session=None):
        super().__init__(config, MY_PROMPT, AgentType.MY_AGENT)
```

Then register it in `agent/events.py` (`AgentType` enum) and `customagents/factory.py` (`create()` method).

## Docker

```bash
docker build -t bezs-agent .
docker run --env-file .env -p 8000:8000 bezs-agent
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, dependency management, and testing.

## Security

This project can process clinical/patient data. See [SECURITY.md](SECURITY.md) for how to report vulnerabilities, and treat any `data/`, `patients/`, or `vault/` directories as sensitive — they're gitignored and should never be committed.

## License

[MIT](LICENSE)
