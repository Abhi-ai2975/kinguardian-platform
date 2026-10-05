from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import router
from app.adapters import MockAIAdapter, MockNotificationAdapter
from app.db import Base, engine
import app.models  # register ORM metadata


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Local-first bootstrap. Production must run Alembic before starting workers.
    yield
    await engine.dispose()


app = FastAPI(title="KinGuardian Platform API", version="1.0.0", lifespan=lifespan)

# Add CORS middleware to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:8082",
        "http://localhost:19006",
        "http://localhost:8000",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8000",
        "http://10.107.196.132:8081",
        "http://10.107.196.132:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.state.notification_adapter = MockNotificationAdapter()
app.state.ai_adapter = MockAIAdapter()
app.include_router(router)


@app.get("/health")
async def health():
    return {"status": "ok"}
