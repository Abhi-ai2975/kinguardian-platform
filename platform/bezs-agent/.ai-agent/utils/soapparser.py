

import re

def parse_soap_note(text: str):
    """
    Convert full SOAP Note text into a dictionary:
    {
        subjective: "...",
        objective: "...",
        assessment: "...",
        plan: "..."
    }

    Handles:
    - Subjective / Subjective:
    - Case differences
    - Extra spaces
    - 'SOAP Note' title
    - Bullet points
    """

    sections = {
        "subjective": "",
        "objective": "",
        "assessment": "",
        "plan": ""
    }

    current = None

    for raw_line in text.split("\n"):
        line = raw_line.strip()

        if not line:
            continue

        # Normalize header (remove trailing colon)
        header = re.sub(r":$", "", line, flags=re.IGNORECASE).lower()

        # Detect section headers
        if header == "subjective":
            current = "subjective"
            continue

        if header == "objective":
            current = "objective"
            continue

        if header == "assessment":
            current = "assessment"
            continue

        if header == "plan":
            current = "plan"
            continue

        # Ignore top title
        if header == "soap note":
            continue

        # Append content to current section
        if current:
            sections[current] += line + "\n"

    return sections