// search-parser.ts — parses the log/audit/trace explorer search box into
// ClickHouse WHERE conditions and named query parameters.
//
// Supported syntax:
//   Plain text        timeout            → message ILIKE '%timeout%'
//   Quoted phrase     "null pointer"     → message ILIKE '%null pointer%'
//   Field exact       severity:error     → severity = 'error'
//   Field wildcard    service:api*       → service_name ILIKE 'api%'
//   Multiple terms    severity:error "db timeout"  → ANDed together
//
// Supported field aliases:
//   severity / level          → severity
//   service / service_name    → service_name
//   env / environment         → environment
//   source                    → source
//   user / user_id            → user_id
//   app / application_id      → application_id
//   trace / trace_id          → trace_id
//   type / event_type         → event_type
//   msg / message             → message (ILIKE)

const FIELD_MAP: Record<string, string> = {
  severity:       "severity",
  level:          "severity",
  service:        "service_name",
  service_name:   "service_name",
  env:            "environment",
  environment:    "environment",
  source:         "source",
  user:           "user_id",
  user_id:        "user_id",
  app:            "application_id",
  application_id: "application_id",
  trace:          "trace_id",
  trace_id:       "trace_id",
  type:           "event_type",
  event_type:     "event_type",
  msg:            "message",
  message:        "message",
};

export interface ParsedQuery {
  // SQL condition fragments containing named params like {sq0: String}.
  conditions: string[];
  // Param values to merge into ClickHouse query_params.
  params: Record<string, string>;
}

// parseSearchQuery converts a raw query string into SQL condition fragments
// and the corresponding ClickHouse named params.
// Returns empty conditions when the input is blank.
export function parseSearchQuery(raw: string): ParsedQuery {
  const trimmed = raw.trim();
  if (!trimmed) return { conditions: [], params: {} };

  const conditions: string[] = [];
  const params: Record<string, string> = {};
  let idx = 0;

  const messageParts: string[] = [];

  for (const tok of tokenize(trimmed)) {
    const colon = tok.indexOf(":");
    if (colon > 0) {
      const fieldRaw = tok.slice(0, colon).toLowerCase();
      // Strip surrounding quotes from value if present.
      const value = tok.slice(colon + 1).replace(/^"(.*)"$/, "$1").trim();
      const column = FIELD_MAP[fieldRaw];

      if (column && value) {
        const key = `sq${idx++}`;
        if (value.includes("*")) {
          // Wildcard: api* → ILIKE 'api%'
          params[key] = value.replace(/\*/g, "%");
          conditions.push(`${column} ILIKE {${key}: String}`);
        } else if (column === "message") {
          // Explicit message:value → substring match
          params[key] = `%${value}%`;
          conditions.push(`message ILIKE {${key}: String}`);
        } else {
          // Exact match for structured fields (severity, source, etc.)
          params[key] = value;
          conditions.push(`${column} = {${key}: String}`);
        }
      } else {
        // Unknown field — treat the whole token as a message substring.
        messageParts.push(tok);
      }
    } else {
      // Plain text or quoted phrase — accumulate for a single ILIKE.
      const clean = tok.replace(/^"(.*)"$/, "$1");
      if (clean) messageParts.push(clean);
    }
  }

  // Combine all plain-text parts into one ILIKE on the message column.
  if (messageParts.length > 0) {
    const key = `sq${idx++}`;
    params[key] = `%${messageParts.join(" ")}%`;
    conditions.push(`message ILIKE {${key}: String}`);
  }

  return { conditions, params };
}

// tokenize splits the input into tokens, respecting double-quoted strings
// so that "null pointer" stays as one token.
function tokenize(s: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < s.length) {
    // Skip whitespace between tokens.
    while (i < s.length && s[i] === " ") i++;
    if (i >= s.length) break;

    if (s[i] === '"') {
      // Quoted string — include everything up to the closing quote.
      const start = i++;
      while (i < s.length && s[i] !== '"') i++;
      if (i < s.length) i++; // consume closing quote
      tokens.push(s.slice(start, i));
    } else {
      // Unquoted token — ends at the next whitespace.
      const start = i;
      while (i < s.length && s[i] !== " ") i++;
      tokens.push(s.slice(start, i));
    }
  }

  return tokens;
}
