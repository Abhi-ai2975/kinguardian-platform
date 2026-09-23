// GET /skills.md — returns a plain-text index of available Watcher24 AI skills.
// AI assistants can fetch this to discover which skill files are available
// and then load the relevant one for the language/framework they need.
import { NextResponse } from "next/server";

export async function GET() {
  const body = `# Watcher24 AI Skills

These skill files teach AI coding assistants how to integrate Watcher24 correctly.
Fetch the relevant file and add it to your assistant's context before writing code.

## Available skills

| Skill | URL | Covers |
|-------|-----|--------|
| JavaScript / Node.js | /skills/watcher24-js.md | @watcher/node, @watcher/browser, @watcher/react, @watcher/nextjs |
| Python | /skills/watcher24-python.md | watcher-sdk, FastAPI, Django, Flask |

## How to use

### Claude Code
Add to your project's CLAUDE.md:
\`\`\`
For observability, read /skills/watcher24-js.md before writing any Watcher24 code.
\`\`\`

### Cursor (.cursorrules)
\`\`\`
Watcher24 SDK skill: https://watcher24.io/skills/watcher24-js.md
\`\`\`

### Copilot (copilot-instructions.md)
\`\`\`
Read https://watcher24.io/skills/watcher24-js.md for Watcher24 integration patterns.
\`\`\`

### Direct fetch
\`\`\`bash
curl https://watcher24.io/skills/watcher24-js.md     # JavaScript / Node.js
curl https://watcher24.io/skills/watcher24-python.md  # Python / FastAPI
\`\`\`
`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
