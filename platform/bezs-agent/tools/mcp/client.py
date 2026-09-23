from dataclasses import dataclass, field
from enum import Enum
import os
from pathlib import Path
from typing import Any
from config.config import MCPServerConfig
from fastmcp import Client
from fastmcp.client.transports import SSETransport, StdioTransport, StreamableHttpTransport


class MCPServerStatus(str, Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"


@dataclass
class MCPToolInfo:

    name: str
    description: str
    input_schema: dict[str, Any] = field(default_factory=dict)
    server_name: str = ""


class MCPClient:
    def __init__(
        self,
        name: str,
        config: MCPServerConfig,
        cwd: Path,
    ) -> None:
        self.name = name
        self.config = config
        self.cwd = cwd
        self.status = MCPServerStatus.DISCONNECTED
        self._client: Client | None = None

        self._tools: dict[str, MCPToolInfo] = dict()

    @property
    def tools(self) -> list[MCPToolInfo]:
        return list(self._tools.values())

    def _create_transport(self) -> StdioTransport | SSETransport | StreamableHttpTransport:
        if self.config.command:
            env = os.environ.copy()
            env.update(self.config.env)

            return StdioTransport(
                command=self.config.command,
                args=list(self.config.args),
                env=env,
                cwd=str(self.config.cwd or self.cwd),
                # log_file=Path(os.devnull),
            )
        else:
            if self.config.url.startswith("http"):
                return StreamableHttpTransport(
                    url=self.config.url,
                    headers=self.config.headers)
            else:
                if self.config.transport == "streamable-http":
                    return StreamableHttpTransport(
                        url=self.config.url,
                        headers=self.config.headers,
                    )

                return SSETransport(
                    url=self.config.url,
                    headers=self.config.headers,
                )

    async def connect(self) -> None:
        if self.status == MCPServerStatus.CONNECTED:
            return

        self.status = MCPServerStatus.CONNECTING

        try:
            self._client = Client(transport=self._create_transport())

            await self._client.__aenter__()

            tool_result = await self._client.list_tools()
            for tool in tool_result:
                self._tools[tool.name] = MCPToolInfo(
                    name=tool.name,
                    description=tool.description or "",
                    input_schema=(
                        tool.inputSchema if hasattr(tool, "inputSchema") else {}
                    ),
                    server_name=self.name,
                )

            self.status = MCPServerStatus.CONNECTED

        except Exception as e:
            self.status = MCPServerStatus.ERROR
            print(f"\n[MCP ERROR] {self.name}")
            print(e)
            raise

    async def disconnect(self) -> None:
        if self._client:
            await self._client.__aexit__(None, None, None)
            self._client = None

        self._tools.clear()
        self.status = MCPServerStatus.DISCONNECTED

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]):
       
        if not self._client or self.status != MCPServerStatus.CONNECTED:
            raise RuntimeError(f"Not connected to server {self.name}")


        try: 

            result = await self._client.call_tool(tool_name, arguments)

            output = []
            for item in result.content:
                try:
                    if hasattr(item, "text"):
                        output.append(str(item.text))
                    elif hasattr(item, "content"):
                        # Handle nested content objects
                        content = item.content
                        if isinstance(content, (int, float)):
                            output.append(str(content))
                        elif isinstance(content, str):
                            output.append(content)
                        else:
                            output.append(str(content))
                    else:
                        # Convert any type to string
                        output.append(str(item))
                except Exception as e:
                    # Fallback conversion
                    try:
                        output.append(str(item))
                    except Exception:
                        output.append(f"Unable to convert item to string: {type(item)}")

            # Ensure final output is a string
            final_output = "\n".join(output) if output else ""
            
            return {
                "output": final_output,
                "is_error": result.is_error,
            }

        except Exception as e:
            # Handle FastMCP validation errors specifically
            error_msg = str(e)
            if "is not of type" in error_msg and "string" in error_msg:
                # Extract the numeric value and convert to string
                import re
                numeric_match = re.search(r'(\d+)\s+is not of type', error_msg)
                if numeric_match:
                    numeric_value = numeric_match.group(1)
                    return {
                        "output": numeric_value,
                        "is_error": False,
                    }
            
            print(f"\n[MCP TOOL ERROR] {tool_name}")
            print(str(e))

            return {
                "output": f"MCP tool failed: {str(e)}",
                "is_error": True,
            }
