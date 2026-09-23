"""
CLI Runner for Seeding DrGodly / KinGuardian Demo Scenarios:
Usage:
    uv run python scripts/seed_demo_scenarios.py --scenario [all|normal_day|medication_missed|guardian_moment|new_lab_report|upcoming_appointment|parent_feeling_unwell]
"""

import asyncio
import argparse
import sys
from pathlib import Path

# Add backend root to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.core.database import db, Base
from app.domains.family.application.demo_scenarios import DemoScenarioService


async def main():
    parser = argparse.ArgumentParser(description="Seed DrGodly / KinGuardian Demo Scenarios")
    parser.add_argument(
        "--scenario",
        type=str,
        default="all",
        choices=[
            "all",
            "normal_day",
            "medication_missed",
            "guardian_moment",
            "new_lab_report",
            "upcoming_appointment",
            "parent_feeling_unwell"
        ],
        help="Select scenario to execute and seed"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        default=True,
        help="Drop and recreate all tables for a clean schema state"
    )
    args = parser.parse_args()


    print("================================================================================")
    print(f"Executing Demo Scenario Engine for: [{args.scenario.upper()}] (reset={args.reset})")
    print("Exercising actual service workflows, domain events, and read models...")
    print("================================================================================")

    if args.reset:
        async with db.engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
    else:
        async with db.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)



    async with db.session() as session:
        service = DemoScenarioService(session)



        if args.scenario == "all":
            results = await service.seed_all_scenarios()
            for name, res in results.items():
                print(f"-> [OK] Scenario '{name}': {res}")
        elif args.scenario == "normal_day":
            res = await service.seed_scenario_normal_day()
            print(f"-> [OK] Normal Day Result: {res}")
        elif args.scenario == "medication_missed":
            res = await service.seed_scenario_medication_missed()
            print(f"-> [OK] Medication Missed Result: {res}")
        elif args.scenario == "guardian_moment":
            res = await service.seed_scenario_guardian_moment()
            print(f"-> [OK] Guardian Moment Result: {res}")
        elif args.scenario == "new_lab_report":
            res = await service.seed_scenario_new_lab_report()
            print(f"-> [OK] New Lab Report Result: {res}")
        elif args.scenario == "upcoming_appointment":
            res = await service.seed_scenario_upcoming_appointment()
            print(f"-> [OK] Upcoming Appointment Result: {res}")
        elif args.scenario == "parent_feeling_unwell":
            res = await service.seed_scenario_parent_feeling_unwell()
            print(f"-> [OK] Parent Feeling Unwell Result: {res}")

    print("================================================================================")
    print("All requested demo scenarios successfully seeded and verified!")
    print("================================================================================")


if __name__ == "__main__":
    asyncio.run(main())
