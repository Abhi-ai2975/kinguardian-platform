from typing import Any


def inline_schema(schema: dict) -> dict:
    """
    Resolve all $ref pointers in a Pydantic model_json_schema() output by
    inlining the referenced definitions.

    Pydantic places sub-model schemas under a top-level "$defs" key and uses
    "$ref": "#/$defs/<Name>" pointers. When the schema is embedded inline
    inside a FastAPI responses={} dict, the "#/$defs/..." path can no longer
    be resolved because $defs is not at the root of the OpenAPI document.
    This function flattens the schema so every "$ref" is replaced with its
    actual content, producing a $ref-free inline schema safe for embedding.

    Circular references (e.g. recursive items like QRItem) are broken by
    emitting { "type": "object" } on the second encounter of the same def.
    """
    defs: dict = schema.get("$defs", {})

    def _resolve(node: Any, seen: frozenset) -> Any:
        if isinstance(node, dict):
            if "$ref" in node and node["$ref"].startswith("#/$defs/"):
                name = node["$ref"][len("#/$defs/"):]
                if name in seen or name not in defs:
                    return {"type": "object", "description": f"(recursive ref: {name})"}
                return _resolve(defs[name], seen | {name})
            return {k: _resolve(v, seen) for k, v in node.items() if k != "$defs"}
        if isinstance(node, list):
            return [_resolve(item, seen) for item in node]
        return node

    return _resolve(schema, frozenset())
