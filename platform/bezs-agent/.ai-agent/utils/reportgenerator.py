from client.llm_client import LLMClient
from client.response import StreamEventType
import json
import re


async def generate_clinical_reports(client: LLMClient, conversation: str) -> dict[str, str]:

    prompt = f"""
You are a clinical documentation assistant.

Based on the patient intake conversation below, generate THREE sections.

1. PATIENT SUMMARY
2. SOAP NOTE
3. ASSESSMENT AND PLAN

Conversation:
{conversation}

Return ONLY valid JSON in this format:

{{
 "summary": "...",
 "soap": "...",
 "assessment": "..."
}}
"""

    response_text = ""

    async for event in client.chat_completion(
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    ):
        if event.type == StreamEventType.TEXT_DELTA and event.text_delta:
            response_text += event.text_delta.content

    # Clean markdown
    response_text = response_text.strip()
    response_text = response_text.replace("```json", "").replace("```", "")

    # Extract JSON block safely
    match = re.search(r"\{.*\}", response_text, re.DOTALL)

    if not match:
        return {
            "summary": "Patient summary could not be generated.",
            "soap": "SOAP report could not be generated.",
            "assessment": "Assessment report could not be generated."
        }

    json_text = match.group(0)

    try:
        data = json.loads(json_text)

        return {
            "summary": data.get("summary", "").strip(),
            "soap": data.get("soap", "").strip(),
            "assessment": data.get("assessment", "").strip()
        }

    except json.JSONDecodeError:

        return {
            "summary": "Patient summary generation failed.",
            "soap": "SOAP report generation failed.",
            "assessment": "Assessment generation failed."
        }