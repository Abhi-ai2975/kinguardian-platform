import asyncio
from agent.agent import Agent   # adjust path if needed
from config.config import Config


async def main():
    config = Config()  # make sure this works in your project

    async with Agent(config) as agent:
        result = await agent.recommend_questions([
            "I have toochache and fever",
            "for 3 days"
        ])

        print("RESULT:")
        print(result)


if __name__ == "__main__":
    asyncio.run(main())