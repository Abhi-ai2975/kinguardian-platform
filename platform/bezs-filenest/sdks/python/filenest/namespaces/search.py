"""
filenest.namespaces.search — SearchNamespace (sync) and AsyncSearchNamespace.

Usage:
    results = fn.search.query("discharge summary")
    for file in fn.search.iterate(q="lab report"):
        process(file)
"""

from __future__ import annotations

from typing import Any, AsyncIterator, Iterator

from filenest.types import File, SearchResults


class SearchNamespace:
    """Synchronous search operations."""

    def __init__(self, http: Any, project_id: str) -> None:
        self._http = http
        self._project_id = project_id

    def query(
        self,
        q: str | None = None,
        filters: dict | None = None,
        facets: list[str] | None = None,
        sort_by: str | None = None,
        sort_order: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> SearchResults:
        """Run a search query."""
        body: dict = {"limit": limit, "offset": offset}
        if q:
            body["q"] = q
        if filters:
            body["filters"] = filters
        if facets:
            body["facets"] = facets
        if sort_by:
            body["sort_by"] = sort_by
        if sort_order:
            body["sort_order"] = sort_order
        raw = self._http.post(f"/v1/projects/{self._project_id}/search", json=body)
        return SearchResults.model_validate(raw)

    def iterate(self, q: str | None = None, filters: dict | None = None) -> Iterator[File]:
        """Iterate over all search results with automatic pagination."""
        offset = 0
        limit = 50
        while True:
            results = self.query(q=q, filters=filters, limit=limit, offset=offset)
            for hit in results.hits:
                yield hit.file
            if len(results.hits) < limit:
                break
            offset += limit


class AsyncSearchNamespace:
    """Asynchronous search operations."""

    def __init__(self, http: Any, project_id: str) -> None:
        self._http = http
        self._project_id = project_id

    async def query(
        self,
        q: str | None = None,
        filters: dict | None = None,
        facets: list[str] | None = None,
        sort_by: str | None = None,
        sort_order: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> SearchResults:
        """Run a search query (async)."""
        body: dict = {"limit": limit, "offset": offset}
        if q:
            body["q"] = q
        if filters:
            body["filters"] = filters
        if facets:
            body["facets"] = facets
        if sort_by:
            body["sort_by"] = sort_by
        if sort_order:
            body["sort_order"] = sort_order
        raw = await self._http.post(f"/v1/projects/{self._project_id}/search", json=body)
        return SearchResults.model_validate(raw)

    async def iterate(self, q: str | None = None, filters: dict | None = None) -> AsyncIterator[File]:
        """Async iterator over all search results."""
        offset = 0
        limit = 50
        while True:
            results = await self.query(q=q, filters=filters, limit=limit, offset=offset)
            for hit in results.hits:
                yield hit.file
            if len(results.hits) < limit:
                break
            offset += limit
