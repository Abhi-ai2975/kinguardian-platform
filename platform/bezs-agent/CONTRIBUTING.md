# Contributing to bezs-agent

Multi-agent clinical voice system with streaming STT, diarization, and MLflow tracking.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (installed automatically if missing)

## Quick Start

```bash
# Clone and enter the project
git clone https://github.com/Yazhnimalan/bezs-agent.git
cd bezs-agent

# Create virtual environment and install dependencies
uv venv
uv pip install -e .

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys (see Configuration below)

# Start the API server
.venv/bin/python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Or with the venv activated:

```bash
source .venv/bin/activate
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

## Configuration

All configuration lives in environment variables. Create a `.env` file:

```env


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

## Project Structure

```
.
├── agent/           # Core agent runtime
├── api/             # FastAPI application + routers
│   ├── main.py      # App entry point
│   ├── routers/     # HTTP route handlers
│   └── wsrouters/   # WebSocket route handlers
├── client/          # LLM client abstraction
├── config/          # Configuration (pydantic models)
├── context/         # Context window management
├── customagents/    # Custom agent implementations
│   ├── diarizeagent/
│   ├── voiceagent/
│   └── factory.py   # Agent factory
├── prompts/         # System prompts
├── speechtospeech/  # Speech pipeline
│   ├── hybrid/      # Streaming + batch diarization
│   │   ├── stt_provider.py
│   │   ├── orchestrator.py
│   │   └── audio_manager.py
│   ├── providers/   # STT/TTS provider implementations
│   └── webvad.py    # VAD wrapper
├── test/            # Test HTML pages
│   ├── index.html   # Voice agent test
│   └── diarze.html  # Diarization test
├── tools/           # Agent tool definitions
└── vault/           # Audio cache directory
```

## Running Tests

Test HTML pages are served by the API. After starting the server:

```bash
# Open test pages in a browser
open http://localhost:8000/test/index.html     # Voice agent test
open http://localhost:8000/test/diarze.html    # Diarization test
```

## Adding a New Agent

Agents follow the 2-file convention:

1. `customagents/myagent/myprompt.py` — system prompt string export
2. `customagents/myagent/myagent.py` — agent class extending `Agent`

```python
# myprompt.py
MY_PROMPT = """You are the MyAgent..."""

# myagent.py
from agent.agent import Agent
from agent.events import AgentType
from customagents.myagent.myprompt import MY_PROMPT

class MyAgent(Agent):
    def __init__(self, config, session=None):
        super().__init__(config, MY_PROMPT, AgentType.MY_AGENT)
```

3. Register in `agent/events.py` — add to `AgentType` enum
4. Register in `customagents/factory.py` — add to `create()` method

## WebSocket Auth

WebSocket endpoints support two auth methods:

- **Bearer token**: `Authorization: Bearer <token>` header
- **Query param**: `?token=<token>` query parameter

The token is validated against the configured IAM JWKS URL.

## Dependency Management

```bash
# Add a new dependency
uv add <package>

# Remove a dependency
uv remove <package>

# Regenerate lock file
uv lock

# Sync environment to lock file
uv sync
```
