"""
JSON Schema utility helpers for OpenAPI documentation.

When Pydantic v2's `model_json_schema()` produces a schema for a model that has
nested sub-models, it outputs a `$defs` block at the root plus `$ref` pointers
inside the schema body:

    {
      "$defs": { "SubModel": { ... } },
      "properties": { "field": { "$ref": "#/$defs/SubModel" } }
    }

This is valid standalone JSON Schema, but when FastAPI embeds the schema object
directly inside an OpenAPI `responses` dict (not via `response_model`), Swagger UI
resolves `$ref` values relative to the OpenAPI document root — not the embedded
schema object. So `#/$defs/SubModel` looks for a top-level `$defs` key in the
whole OpenAPI document rather than the local `$defs`, and the reference fails.

`inline_schema` eliminates the problem by recursively substituting every `$ref`
with the actual definition it points to, then removing the now-unnecessary `$defs`
block. The result is a fully self-contained schema with no dangling references.
"""

from typing import Any


def inline_schema(schema: dict) -> dict:
    """
    Resolve all `$ref` pointers in a Pydantic-generated JSON Schema by inlining
    the definitions from `$defs`, then remove the `$defs` block entirely.

    Pydantic v2's `model_json_schema()` places sub-model schemas under a top-level
    `$defs` key and references them via `"$ref": "#/$defs/<Name>"`. When the schema
    is embedded inline inside a FastAPI `responses={}` dict, Swagger UI resolves
    `#/$defs/...` relative to the OpenAPI document root — not the embedded object —
    so the references become unresolvable. This function flattens the schema so
    every `$ref` is replaced with its actual content, producing a `$ref`-free schema
    that is safe to embed anywhere in the OpenAPI document.

    Circular references (e.g. a model that contains a list of itself) are broken by
    emitting `{"type": "object"}` on the second encounter of the same definition
    name, preventing infinite recursion.

    Args:
        schema: A JSON Schema dict as returned by `Model.model_json_schema()`.

    Returns:
        A new schema dict with all `$ref` values resolved inline and no `$defs`.
    """
    # Read $defs without modifying the original schema — the dict is shared and
    # cached on the Pydantic model class, so mutation would affect future callers.
    defs: dict = schema.get("$defs", {})

    def _resolve(node: Any, seen: frozenset) -> Any:
        """
        Recursively walk `node`, substituting `$ref` dicts with their definitions.

        `seen` tracks which definition names are currently on the resolution stack.
        When a name appears in `seen` again it means we have a circular reference —
        we break the cycle by returning a generic object schema instead of looping.
        """
        if isinstance(node, dict):
            if "$ref" in node and node["$ref"].startswith("#/$defs/"):
                # Extract the definition name from the canonical Pydantic $ref path.
                name = node["$ref"][len("#/$defs/"):]
                # Break circular refs — emit a stub rather than recurse infinitely.
                if name in seen or name not in defs:
                    return {"type": "object", "description": f"(recursive ref: {name})"}
                # Inline the definition and continue resolving inside it.
                return _resolve(defs[name], seen | {name})
            # Walk all keys, stripping $defs since all refs are now inlined.
            return {k: _resolve(v, seen) for k, v in node.items() if k != "$defs"}
        if isinstance(node, list):
            return [_resolve(item, seen) for item in node]
        # Scalar (str, int, bool, None) — nothing to resolve.
        return node

    return _resolve(schema, frozenset())
