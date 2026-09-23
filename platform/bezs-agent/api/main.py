"""
FastAPI application module
"""
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
import logging
from fastapi.responses import JSONResponse

from agent.agent import Agent
from config.config import Config
from customagents.sessionmanager import SessionManager
from api.routers.agent import router as agent_router
from api.routers.consult import router as consult_router
from api.routers.ehr import router as ehr_router
from api.wsrouters.webs2s import router as webs2s_router
from api.wsrouters.diarize import router as diarize_router
from api.wsrouters.diarize import router as diarization_router
from fastapi.middleware.cors import CORSMiddleware

from api.auth import decode_token

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):

    logger.info("Starting Alees AI Agent Runtime")

    config = Config()
    session_manager = SessionManager()

    app.state.config = config
    app.state.session_manager = session_manager

    logger.info("System initialized successfully")

    yield

    logger.info("Shutting down runtime")

# Create FastAPI application
def create_app():

    app = FastAPI(
        title="AI Agent API",
        version="1.0",
        lifespan=lifespan
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
   
    @app.middleware("http")
    async def auth_middleware(request: Request, call_next):

        public_paths = ["/docs", "/openapi.json", "/health", "/ws"]

        if request.url.path.startswith(tuple(public_paths)):
            return await call_next(request)

        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing authentication token"}
            )

        token = auth_header.split(" ")[1]

        try:
            user = decode_token(token)

            request.state.user = user
            request.state.token = token

        except Exception as e:
            print("JWT ERROR:", str(e))

            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or expired token"}
            )

        response = await call_next(request)

        return response

    app.include_router(agent_router, prefix="/api")
    app.include_router(consult_router, prefix="/api")
    app.include_router(ehr_router, prefix="/api")
    app.include_router(webs2s_router, prefix="/ws")
    app.include_router(diarize_router, prefix="/ws")
    app.include_router(diarization_router, prefix="/ws")

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return app


# Global app instance
app = create_app()

def get_config(request: Request) -> Config:
    return request.app.state.config
# Helper function to get agent
# def get_agent(request: Request) -> Agent:
#     return request.app.state.agent