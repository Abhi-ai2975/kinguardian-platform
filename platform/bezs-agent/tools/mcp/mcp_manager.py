import asyncio
from typing import Any
from config.config import Config
from tools.mcp.client import MCPClient, MCPServerStatus
from tools.mcp.mcp_tool import MCPTool
from tools.registry import ToolRegistry


class MCPManager:
    def __init__(self, config: Config):
        self.config = config
        self._clients: dict[str, MCPClient] = {}
        self._initialized = False

    async def initialize(self, auth_token: str | None = None) -> None:
        
        if self._initialized:
            return

        mcp_configs = self.config.mcp_servers_config

        if not mcp_configs:
            return

        for name, server_config in mcp_configs.items():
            if not server_config.enabled:
                continue

            headers = dict(server_config.headers or {})

            # inject runtime auth
            if auth_token:
                headers["Authorization"] = (
                    f"Bearer {auth_token}"
                )
            print("AUTH TOKEN:", auth_token)
            print("HEADERS:", headers)
            runtime_config = server_config.model_copy(
                update={
                    "headers": headers
                }
            )

            self._clients[name] = MCPClient(
                name=name,
                config=runtime_config,
                cwd=self.config.cwd,
            )

        # connection_tasks = [
        #     asyncio.wait_for(
        #         client.connect(),
        #         timeout=client.config.startup_timeout_sec,
        #     )
        #     for name, client in self._clients.items()
        # ]

        # await asyncio.gather(*connection_tasks, return_exceptions=True)

        # self._initialized = True

        connection_tasks = [
            asyncio.wait_for(
                client.connect(),
                timeout=client.config.startup_timeout_sec,
            )
            for client in self._clients.values()
        ]

        results = await asyncio.gather(
            *connection_tasks,
            return_exceptions=True
        )

        for result in results:
            if isinstance(result, Exception):
                print("[MCP CONNECTION ERROR]", result)

        self._initialized = True

    def register_tools(self, registry: ToolRegistry) -> int:
        count = 0

        for client in self._clients.values():
            if client.status != MCPServerStatus.CONNECTED:
                continue

            for tool_info in client.tools:
                mcp_tool = MCPTool(
                    tool_info=tool_info,
                    client=client,
                    config=self.config,
                    name=f"{client.name}__{tool_info.name}",
                )
                registry.register(mcp_tool)
                count += 1

        return count

    async def shutdown(self) -> None:
        disconnection_tasks = [client.disconnect() for client in self._clients.values()]

        await asyncio.gather(*disconnection_tasks, return_exceptions=True)

        self._clients.clear()
        self._initialized = False

    def get_all_servers(self) -> list[dict[str, Any]]:
        servers = []
        for name, client in self._clients.items():
            server_info = {
                "name": name,
                "status": client.status.value,
                "tools": len(client.tools),
            }
            servers.append(server_info)

        return servers
