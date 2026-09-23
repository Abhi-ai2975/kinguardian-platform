"""
MockAgentGateway - Development & Testing Adapter Fallback for AI Agent Services.
Simulates AI safety analysis, conversational guardian responses, and structured
action proposals without requiring external LLM model endpoints.
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone


class MockAgentGateway:
    """
    In-memory Mock AI Agent Gateway.
    Allows local development and end-to-end guardian workflow testing
    without external LLM services or agent daemons.
    """

    def __init__(self):
        self._conversations: Dict[str, List[Dict[str, Any]]] = {}
        self._proposed_actions: Dict[str, Dict[str, Any]] = {}


    async def generate_response(
        self,
        session_id: str,
        prompt: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Generates a safe synthetic agent conversational response."""
        now = datetime.now(timezone.utc).isoformat()

        # Simple keyword-aware mock responses
        prompt_lower = prompt.lower()
        if "medication" in prompt_lower or "medicine" in prompt_lower:
            reply = (
                "Based on the care plan, morning medications were confirmed on time. "
                "Next scheduled dose is at 20:00 IST."
            )
        elif "checkin" in prompt_lower or "feeling" in prompt_lower:
            reply = (
                "The latest wellbeing check-in was positive. Both parents reported feeling good."
            )
        elif "appointment" in prompt_lower or "doctor" in prompt_lower:
            reply = (
                "There is an upcoming Cardiology follow-up scheduled with Dr. Rao."
            )
        else:
            reply = (
                "KinGuardian Guardian AI is monitoring health trends. All vital signs are within normal baselines."
            )

        message_record = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "prompt": prompt,
            "response": reply,
            "context_summary": list(context.keys()) if context else [],
            "created_at": now
        }

        self._conversations.setdefault(session_id, []).append(message_record)

        return {
            "session_id": session_id,
            "message": reply,
            "confidence": 0.95,
            "safety_passed": True,
            "created_at": now
        }

    async def propose_action(
        self,
        session_id: str,
        action_type: str,
        payload: Dict[str, Any],
        requires_approval: bool = True
    ) -> Dict[str, Any]:
        """Creates a mock proposed AI action awaiting user approval."""
        action_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        action_record = {
            "action_id": action_id,
            "session_id": session_id,
            "action_type": action_type,
            "payload": payload,
            "requires_approval": requires_approval,
            "status": "pending_approval" if requires_approval else "executed",
            "created_at": now
        }

        self._proposed_actions[action_id] = action_record
        return action_record

    async def evaluate_trend(
        self,
        subject_id: str,
        metric_name: str,
        observations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Simulates automated trend detection on health metrics."""
        now = datetime.now(timezone.utc).isoformat()
        count = len(observations)

        return {
            "subject_id": subject_id,
            "metric_name": metric_name,
            "data_points_analyzed": count,
            "trend_direction": "stable",
            "baseline_drift_percent": 1.2,
            "anomaly_detected": False,
            "insight_summary": f"Observed stable {metric_name} across {count} records within expected range.",
            "evaluated_at": now
        }
