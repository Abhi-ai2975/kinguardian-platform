"""
app.auth.ip_allowlist — Per-project IP allowlist enforcement.

Checks the caller's IP address against the project's configured CIDR allowlist.
A null or empty allowlist means all IPs are permitted (no restriction).

The caller IP is read from X-Forwarded-For (first entry, i.e. the leftmost
address added by the first proxy) when the header is present, otherwise from
the direct TCP connection. This is the server or SDK IP that called the API,
NOT the end-user's browser IP.

Usage:
    from app.auth.ip_allowlist import check_ip_allowlist
    check_ip_allowlist(config.allowed_ips, request)
"""
import ipaddress

from fastapi import Request

from app.errors import PermissionDeniedError


def check_ip_allowlist(allowed_ips_csv: str | None, request: Request) -> None:
    """
    Assert that the caller's IP is within the project's IP allowlist.

    A null or empty allowed_ips_csv passes immediately (no restriction).

    Args:
        allowed_ips_csv: Comma-separated CIDR blocks from ProjectConfig.allowed_ips,
                         or None / empty string if no allowlist is configured.
        request:         The current FastAPI request object.

    Raises:
        PermissionDeniedError: If the caller's IP is not in any allowed network.
    """
    if not allowed_ips_csv:
        return

    allowed_networks: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = []
    for cidr in allowed_ips_csv.split(","):
        cidr = cidr.strip()
        if cidr:
            try:
                allowed_networks.append(ipaddress.ip_network(cidr, strict=False))
            except ValueError:
                # Malformed CIDR stored in DB — skip rather than crash
                continue

    if not allowed_networks:
        return

    # X-Forwarded-For: client, proxy1, proxy2 — we trust the leftmost (first) entry.
    x_forwarded = request.headers.get("X-Forwarded-For", "")
    if x_forwarded:
        caller_ip_str = x_forwarded.split(",")[0].strip()
    else:
        caller_ip_str = request.client.host if request.client else "127.0.0.1"

    try:
        caller_ip = ipaddress.ip_address(caller_ip_str)
    except ValueError:
        raise PermissionDeniedError(
            f"IP allowlist check failed: cannot parse caller address {caller_ip_str!r}"
        )

    if not any(caller_ip in network for network in allowed_networks):
        raise PermissionDeniedError("Caller IP is not in the project IP allowlist")
