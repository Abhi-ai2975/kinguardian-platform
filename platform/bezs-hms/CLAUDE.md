@AGENTS.md

# Code Documentation Standards

Every file written in this project **must** be well-commented. Comments are not optional.

- **File-level:** A comment block at the top of every file describing what it does and its role in the architecture (e.g. which layer, what resource it handles).
- **Classes:** JSDoc block explaining what the class is responsible for and what it wraps or orchestrates.
- **Functions/methods:** JSDoc with `@param`, `@returns`, and `@throws` for every public function. One-line description minimum.
- **Inline:** Comment any non-obvious logic, HTTP status mappings, workarounds, or business rules. When in doubt, add the comment.
- This rule overrides the default "no comments" behavior. Always add comments in this project.

# File Naming Conventions

- **UI component files** (React components, modals, forms, cards, layouts) must use **PascalCase** — e.g. `PractitionerCard.tsx`, `BookAppointment.tsx`, `StepIndicator.tsx`.
- **Non-component files** (hooks, utilities, actions, schemas, services, configs) use **camelCase** or **kebab-case** as appropriate — e.g. `useBooking.ts`, `appointment.rest.service.ts`.
- Next.js reserved files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`) keep their lowercase Next.js names regardless of the above.

# Skills
- **server-module** (`.claude/skills/server-module/SKILL.md`) - scaffold a new clean-arch orchestrator client module. Trigger: `/server-module`
When the user types `/server-module`, invoke the Skill tool with `skill: "server-module"` before doing anything else.

- **client-module** (`.claude/skills/client-module/SKILL.md`) - scaffold a complete client module (table, columns, modals, forms, queries, store, provider, page) for a new resource screen. Trigger: `/client-module`
When the user types `/client-module`, invoke the Skill tool with `skill: "client-module"` before doing anything else.

- **data-table** (`.claude/skills/data-table/SKILL.md`) - scaffold a fully-featured data table for a new screen using the shared TanStack Table v8 system. Trigger: `/data-table`
When the user types `/data-table`, invoke the Skill tool with `skill: "data-table"` before doing anything else.

- **modal-system** (`.claude/skills/modal-system/SKILL.md`) - scaffold or extend the Zustand store + modals folder + modal provider for a section. Use when a section needs store-driven modals without a full /client-module scaffold. Trigger: `/modal-system`
When the user types `/modal-system`, invoke the Skill tool with `skill: "modal-system"` before doing anything else.
