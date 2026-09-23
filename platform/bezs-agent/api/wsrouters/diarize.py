from __future__ import annotations

import asyncio
import logging
from typing import Any, AsyncGenerator

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from api.auth import decode_token
from customagents.factory import AgentFactory
from customagents.sessionmanager import SessionManager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/diarize")
async def diarized_consultation(ws: WebSocket) -> None:
    token = _extract_token(ws)
    if not token:
        await ws.close(code=1008)
        return

    try:
        user = decode_token(token)
        ws.state.user = user
    except Exception as exc:
        logger.error("WebSocket auth failed: %s", exc)
        await ws.close(code=1008)
        return

    await ws.accept()
    user_id = str(user.get("id", "unknown_user"))
    logger.info("Diarization session started — user=%s", user_id)

    config = ws.app.state.config
    session_manager: SessionManager = ws.app.state.session_manager
    connection_open = True
    ws_write_lock = asyncio.Lock()

    async def safe_send_json(data: dict[str, Any]) -> None:
        nonlocal connection_open
        async with ws_write_lock:
            if not connection_open:
                return
            try:
                await ws.send_json(data)
            except WebSocketDisconnect:
                connection_open = False
                raise
            except Exception as exc:
                connection_open = False
                logger.error("WebSocket send failed: %s", exc)
                raise

    async def safe_close(code: int = 1000, reason: str = "") -> None:
        nonlocal connection_open
        async with ws_write_lock:
            if not connection_open:
                return
            try:
                await ws.close(code=code, reason=reason)
            except Exception as exc:
                logger.debug("WebSocket close failed: %s", exc)
            finally:
                connection_open = False

    session = await session_manager.get_session(user_id, config)
    if not session.context_manager:
        await session.initialize()

    async def ws_on_partial(transcript: dict[str, Any]) -> None:
        text = transcript.get("text", "").strip()
        if not text:
            return
        language = transcript.get("language")
        if language and language not in ("unknown", "en-IN", "en"):
            try:
                await safe_send_json({"type": "language", "code": language})
            except WebSocketDisconnect:
                pass
        if transcript.get("is_final") and text:
            try:
                await safe_send_json({"type": "partial", "text": text})
            except WebSocketDisconnect:
                pass
        elif text:
            try:
                await safe_send_json({"type": "draft", "text": text})
            except WebSocketDisconnect:
                pass

    agent = AgentFactory.create("diarize", config, session=session)

    try:
        async def audio_source() -> AsyncGenerator[bytes, None]:
            while connection_open:
                try:
                    chunk = await asyncio.wait_for(
                        ws.receive_bytes(), timeout=0.5
                    )
                    yield chunk
                except asyncio.TimeoutError:
                    continue
                except WebSocketDisconnect:
                    break
                except Exception as exc:
                    logger.error("audio_source error: %s", exc)
                    break

        async for event in agent.run(
            audio_source(),
            silence_timeout=15.0,
            max_session_duration=600.0,
            on_partial=ws_on_partial,
        ):
            if event.type == "agent_error":
                await safe_send_json({
                    "type": "error",
                    "message": event.data.get("error", "Unknown error"),
                })
            elif event.type == "text_complete":
                final_text = event.data.get("content", "")
                await safe_send_json({
                    "type": "final",
                    "transcript": final_text,
                })

    except WebSocketDisconnect:
        logger.info("Client disconnected — user=%s", user_id)
    except Exception as exc:
        logger.exception("Diarization session error: %s", exc)
        try:
            await safe_send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass
    finally:
        if agent and agent.session and agent.session.client:
            await agent.session.client.close()
        try:
            await safe_close()
        except Exception:
            pass
        logger.info("Diarization session ended — user=%s", user_id)


def _extract_token(ws: WebSocket) -> str | None:
    auth_header = ws.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header.split(" ")[1]
    return ws.query_params.get("token")
