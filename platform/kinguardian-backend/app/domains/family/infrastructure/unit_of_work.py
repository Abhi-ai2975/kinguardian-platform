"""
Unit of Work Pattern Implementation for KinGuardian.

Coordinates atomic transactional boundaries across multiple repositories:
- AppProfileRepository
- FamilyRepository
- ConsentRepository
- EventRepository / OutboxService

Ensures all business mutations and outbox staging either commit together or roll back completely.
"""

import abc
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import db
from app.domains.family.domain.interfaces import (
    IAppProfileRepository,
    IFamilyRepository,
    IConsentRepository
)
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.events.outbox import OutboxService


class IUnitOfWork(abc.ABC):
    """
    Abstract Unit of Work interface.
    """
    profiles: IAppProfileRepository
    families: IFamilyRepository
    consents: IConsentRepository
    events: EventService
    outbox: OutboxService

    @abc.abstractmethod
    async def __aenter__(self) -> "IUnitOfWork":
        pass

    @abc.abstractmethod
    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        pass

    @abc.abstractmethod
    async def commit(self) -> None:
        pass

    @abc.abstractmethod
    async def rollback(self) -> None:
        pass


class SQLAlchemyUnitOfWork(IUnitOfWork):
    """
    SQLAlchemy implementation of the Unit of Work pattern.
    Manages session lifecycle, atomic commits, rollbacks, and repository instances.
    """
    def __init__(self, session_factory=None, session: Optional[AsyncSession] = None):
        self._session_factory = session_factory or db.session_maker
        self._session: Optional[AsyncSession] = session
        self._owns_session: bool = session is None

    async def __aenter__(self) -> "SQLAlchemyUnitOfWork":
        if self._session is None:
            self._session = self._session_factory()
            self._owns_session = True


        self.profiles = SQLAlchemyAppProfileRepository(self._session)
        self.families = SQLAlchemyFamilyRepository(self._session)
        self.consents = SQLAlchemyConsentRepository(self._session)
        self.events = EventService(self._session)
        self.outbox = OutboxService(self._session)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        if exc_type is not None:
            await self.rollback()
        if self._owns_session and self._session is not None:
            await self._session.close()

    async def commit(self) -> None:
        if self._session:
            await self._session.commit()

    async def rollback(self) -> None:
        if self._session:
            await self._session.rollback()

    @property
    def session(self) -> AsyncSession:
        if self._session is None:
            raise RuntimeError("Unit of Work has not been entered. Use 'async with uow:'")
        return self._session
