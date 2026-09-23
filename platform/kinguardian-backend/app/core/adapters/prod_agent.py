"""
Production Agent Gateway.
Integrates with the external autonomous AI Agent microservice / LLM orchestrator
via HTTP REST endpoints with granular timeouts, safe bounded retry handling,
and Circuit Breaker protection.
"""

from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.logging import get_logger
from app.core.resilience.http_client import ResilientHTTPClient, TimeoutConfig, RetryPolicy
from app.core.resilience.circuit_breaker import agent_circuit_breaker

logger = get_logger(__name__)


class AgentGateway:
    """
    Production AI Agent Gateway.
    Delegates conversational prompts and structured action proposals
    to the autonomous agent runtime with bounded connection/read timeouts
    and circuit breaker protection to prevent thread starvation during LLM downtime.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None
    ):
        self.base_url = (base_url or settings.AGENT_SERVICE_URL).rstrip("/")
        total_timeout = timeout if timeout is not None else settings.AGENT_TIMEOUT
        self.timeout_config = TimeoutConfig(
            connect=3.0,
            read=min(total_timeout, 12.0),
            write=4.0,
            pool=2.0,
            total=total_timeout
        )
        self.timeout = total_timeout
        self.retry_policy = RetryPolicy(max_retries=2, base_backoff_seconds=0.4)
        self.client = ResilientHTTPClient(
            service_name="AgentService",
            timeout_config=self.timeout_config,
            retry_policy=self.retry_policy
        )

    async def generate_response(
        self,
        session_id: str,
        prompt: str,
        context: Optional[Dict[str, Any]] = None,
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"

        payload = {
            "session_id": session_id,
            "prompt": prompt,
            "context": context or {}
        }

        async def _do_generate():
            res = await self.client.execute_request(
                method="POST",
                url=f"{self.base_url}/api/v1/agent/chat",
                json_data=payload,
                headers=headers
            )
            if res.status_code == 200:
                return res.json()
            raise RuntimeError(f"Agent service responded with status {res.status_code}")

        try:
            return await agent_circuit_breaker.call(_do_generate)
        except Exception as e:
            logger.error(f"AgentGateway: generate_response failed: {e}")
            raise RuntimeError(f"Agent inference failed: {e}")

    async def propose_action(
        self,
        session_id: str,
        action_type: str,
        payload: Dict[str, Any],
        requires_approval: bool = True,
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"

        body = {
            "session_id": session_id,
            "action_type": action_type,
            "payload": payload,
            "requires_approval": requires_approval
        }

        async def _do_propose():
            res = await self.client.execute_request(
                method="POST",
                url=f"{self.base_url}/api/v1/agent/propose-action",
                json_data=body,
                headers=headers
            )
            if res.status_code == 200:
                return res.json()
            raise RuntimeError(f"Agent service responded with status {res.status_code}")

        try:
            return await agent_circuit_breaker.call(_do_propose)
        except Exception as e:
            logger.error(f"AgentGateway: propose_action failed: {e}")
            raise RuntimeError(f"Agent action proposal failed: {e}")

    async def evaluate_trend(
        self,
        subject_id: str,
        metric_name: str,
        observations: List[Dict[str, Any]],
        auth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"

        body = {
            "subject_id": subject_id,
            "metric_name": metric_name,
            "observations": observations
        }

        async def _do_evaluate():
            res = await self.client.execute_request(
                method="POST",
                url=f"{self.base_url}/api/v1/agent/evaluate-trend",
                json_data=body,
                headers=headers
            )
            if res.status_code == 200:
                return res.json()
            raise RuntimeError(f"Agent service responded with status {res.status_code}")

        try:
            return await agent_circuit_breaker.call(_do_evaluate)
        except Exception as e:
            logger.error(f"AgentGateway: evaluate_trend failed: {e}")
            raise RuntimeError(f"Agent trend evaluation failed: {e}")
