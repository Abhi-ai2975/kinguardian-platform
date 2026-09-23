import asyncio

from config.config import Config
from agent.session import Session

from customagents.reportagent.clinicalextraction import (
    ClinicalExtractionAgent
)


async def main():

    config = Config()

    session = Session(config)

    await session.initialize()

    agent = ClinicalExtractionAgent(
        config=config,
        session=session
    )

    soap_note = {
        "subjective": {
            "chiefComplaint": "Fever and cough for 3 days"
        },
        "objective": {
            "vitals": {
                "temperature": "101 F",
                "bloodPressure": "140/90 mmHg"
            }
        },
        "assessment": {
            "diagnosis": [
                "Upper Respiratory Tract Infection"
            ]
        },
        "plan": {
            "medications": [
                {
                    "name": "Amoxicillin",
                    "dose": "500 mg",
                    "frequency": "TID",
                    "duration": "7 days"
                }
            ],
            "orders": [
                "Chest X-Ray",
                "Complete Blood Count"
            ]
        }
    }

    assessment_report = {
        "primaryDiagnosis": "Upper Respiratory Tract Infection",
        "recommendations": [
            "Chest X-Ray",
            "CBC"
        ]
    }

    result = await agent.generate(
        soap_note=soap_note,
        assessment_report=assessment_report
    )

    print(result)


if __name__ == "__main__":
    asyncio.run(main())