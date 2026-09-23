# Bot Execution Engine

**Medplum reference:** `packages/server/src/bots/execute.ts`

---

## Medplum Bot Model

In Medplum, a Bot is a `Bot` resource storing TypeScript source code.  
When triggered, the code runs in an AWS Lambda function with access to the FHIR API.

```json
{
  "resourceType": "Bot",
  "id": "bot-critical-value",
  "name": "Critical Value Alerter",
  "code": "export async function handler(medplum, event) {\n  const obs = event.input;\n  const value = obs.valueQuantity?.value;\n  if (value > 200 || value < 50) {\n    await medplum.createResource({ resourceType: 'Task', status: 'requested', ... });\n  }\n}"
}
```

### Trigger Registration — Subscription

Bots are triggered via FHIR Subscriptions:

```json
{
  "resourceType": "Subscription",
  "criteria": "Observation?code=http://loinc.org|2345-7",
  "channel": {
    "type": "rest-hook",
    "endpoint": "Bot/bot-critical-value/$execute"
  }
}
```

---

## Our Python Equivalent — Automation Functions

We implement the same concept in Python. Instead of code stored in a `Bot` resource,  
we register Python functions in a decorator-based registry:

### Automation Registry

```python
# app/automation/registry.py

from collections import defaultdict
from typing import Callable, Awaitable
import re

AutomationHandler = Callable[["AutomationContext"], Awaitable[None]]

class AutomationRegistry:
    def __init__(self):
        self._handlers: dict[str, list[AutomationHandler]] = defaultdict(list)

    def on(self, criteria: str):
        """Register a handler for a FHIR search criteria pattern."""
        def decorator(fn: AutomationHandler):
            self._handlers[criteria].append(fn)
            return fn
        return decorator

    async def dispatch(self, resource_type: str, operation: str, resource: dict, context: dict):
        """Find matching handlers and execute them."""
        for criteria, handlers in self._handlers.items():
            if self._matches(criteria, resource_type, resource):
                ctx = AutomationContext(resource=resource, operation=operation, **context)
                for handler in handlers:
                    await handler(ctx)

    def _matches(self, criteria: str, resource_type: str, resource: dict) -> bool:
        crit_type, _, params = criteria.partition("?")
        return crit_type == resource_type and self._eval_params(parse_qs(params), resource)

automation = AutomationRegistry()
```

### Automation Context

```python
# app/automation/context.py

@dataclass
class AutomationContext:
    resource: dict              # the FHIR resource that triggered the automation
    operation: str              # 'create', 'update', 'delete'
    user_id: str
    org_id: str
    patient_repo: Any = None
    encounter_repo: Any = None
    task_repo: Any = None
    notification_svc: Any = None
    ai_client: Any = None
```

### Writing Automations

```python
# app/automation/handlers/critical_values.py

from app.automation.registry import automation, AutomationContext

@automation.on("Observation?category=laboratory")
async def check_critical_values(ctx: AutomationContext):
    obs = ctx.resource
    value = obs.get("valueQuantity", {}).get("value")
    loinc = next(
        (c["code"] for c in obs.get("code", {}).get("coding", []) if c.get("system") == "http://loinc.org"),
        None
    )
    threshold = CRITICAL_THRESHOLDS.get(loinc)
    if threshold and (value > threshold.high or value < threshold.low):
        patient_ref = obs["subject"]["reference"]
        await ctx.task_repo.create({
            "status": "requested",
            "intent": "order",
            "priority": "urgent",
            "code": { "text": f"Critical lab value: {loinc} = {value}" },
            "for": { "reference": patient_ref },
        }, ctx.user_id, ctx.org_id)
        await ctx.notification_svc.send_alert(
            to_role="nurse",
            org_id=ctx.org_id,
            subject="Critical Lab Value",
            body=f"Patient has critical {loinc}: {value}",
        )

@automation.on("Appointment")
async def send_appointment_reminder(ctx: AutomationContext):
    if ctx.operation != "create":
        return
    appt = ctx.resource
    patient_ref = appt["participant"][0]["actor"]["reference"]
    scheduled = appt.get("start")
    await ctx.notification_svc.schedule_sms(
        patient_ref=patient_ref,
        send_at=datetime.fromisoformat(scheduled) - timedelta(hours=24),
        message=f"Reminder: You have an appointment on {scheduled}",
    )
```

---

## Bot-as-Resource (Future Enhancement)

For a full Medplum-equivalent, store automation code as a `AutomationBot` FHIR-like resource:

```sql
CREATE TABLE automation_bots (
    id SERIAL PRIMARY KEY,
    bot_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    source_code TEXT NOT NULL,    -- Python source code
    runtime TEXT NOT NULL DEFAULT 'python3.12',
    status TEXT NOT NULL DEFAULT 'active',
    criteria TEXT NOT NULL,       -- FHIR search criteria to trigger on
    org_id TEXT NOT NULL,
    last_executed_at TIMESTAMPTZ,
    execution_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bot_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id INTEGER NOT NULL REFERENCES automation_bots(bot_id),
    trigger_resource_type TEXT NOT NULL,
    trigger_resource_id INTEGER NOT NULL,
    status TEXT NOT NULL,         -- 'success', 'error', 'timeout'
    output TEXT,
    error TEXT,
    duration_ms INTEGER,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Execution Isolation

For production safety, automations should run in isolated subprocess or worker:

```python
# app/automation/executor.py

class AutomationExecutor:
    async def execute_safely(self, handler: AutomationHandler, ctx: AutomationContext) -> BotResult:
        """Execute with timeout and error isolation."""
        try:
            async with asyncio.timeout(30):  # 30 second limit
                await handler(ctx)
                return BotResult(status="success")
        except asyncio.TimeoutError:
            return BotResult(status="timeout", error="Handler exceeded 30s limit")
        except Exception as e:
            logger.error(f"Automation handler failed: {e}", exc_info=True)
            return BotResult(status="error", error=str(e))
```

---

## Integration into Mutation Flow

```python
# In service base class or repository post-hooks:

class BaseService:
    async def after_create(self, resource, fhir: dict, user_id: str, org_id: str):
        ctx = AutomationContext(resource=fhir, operation="create", user_id=user_id, org_id=org_id, ...)
        await automation.dispatch(self.RESOURCE_TYPE, "create", fhir, asdict(ctx))

    async def after_update(self, resource, fhir: dict, user_id: str, org_id: str):
        ctx = AutomationContext(resource=fhir, operation="update", ...)
        await automation.dispatch(self.RESOURCE_TYPE, "update", fhir, asdict(ctx))
```

---

## API Endpoints

```
POST /Bot                        — Register a new bot
GET  /Bot                        — List bots
GET  /Bot/{id}                   — Get bot
PUT  /Bot/{id}                   — Update bot (edit code)
POST /Bot/{id}/$execute          — Manually trigger a bot with a test resource
GET  /Bot/{id}/$executions       — List recent executions
```
