from agent.session import Session
from config.config import Config

class SessionManager:
    def __init__(self):
        self.sessions: dict[str, Session] = {}

    async def get_session(self, user_id: str, config: Config) -> Session:

        if user_id not in self.sessions:
            session = Session(config)
            # await session.initialize()

            # attach metadata (optional but powerful)
            session.metadata["user_id"] = user_id

            self.sessions[user_id] = session

        return self.sessions[user_id]

    def reset_session(self, user_id: str):
        if user_id in self.sessions:
            self.sessions[user_id].reset()

    def delete_session(self, user_id: str):
        if user_id in self.sessions:
            del self.sessions[user_id]