"""
app.auth.signed_url_policy — Presigned URL TTL resolution for project security config.

When require_signed_urls is True, the config TTL is always used and callers cannot
override it. This prevents clients from requesting arbitrarily long-lived URLs that
bypass the project's security policy.

When require_signed_urls is False, the caller's requested TTL is honoured, falling
back to the project config value when the caller does not specify one.

Usage:
    from app.auth.signed_url_policy import resolve_ttl
    ttl = resolve_ttl(config, caller_ttl=request_param_ttl)
"""
from app.models.project_config import ProjectConfig


def resolve_ttl(config: ProjectConfig, caller_ttl: int | None = None) -> int:
    """
    Return the effective TTL for a presigned URL given the project config and any
    caller-supplied TTL override.

    Args:
        config:     ProjectConfig for the current project.
        caller_ttl: TTL (seconds) supplied by the API caller, or None if not provided.

    Returns:
        Effective TTL in seconds. Always equals config.signed_url_ttl_seconds when
        require_signed_urls is True; otherwise the caller_ttl if provided, else config value.
    """
    if config.require_signed_urls:
        return config.signed_url_ttl_seconds
    return caller_ttl if caller_ttl is not None else config.signed_url_ttl_seconds
