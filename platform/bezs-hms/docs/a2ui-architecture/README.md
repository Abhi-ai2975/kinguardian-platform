# A2UI Architecture — Documentation Index

**A2UI** ("Agent-to-UI") is drgodly's system for letting an AI agent (or a
deterministic workflow definition) describe a user interface as **JSON**, and
have the browser render that JSON as real, interactive React components —
forms, buttons, tables, charts, date pickers, file uploads, and more.

Instead of a developer hand-writing a React form for every FHIR resource
(Patient, Appointment, Encounter, …), the *shape* of the form lives in a JSON
file. A generic renderer walks that JSON and produces the UI. This means new
forms can be added by writing JSON, not by writing new React components.

This folder documents everything the system is built from, and — as a
concrete worked example — the REST→GraphQL migration work done on the
`create_patient` / `admin_create_patient` workflows.

## Reading order

If you are new to this codebase, read these in order:

1. **[01-what-is-a2ui.md](./01-what-is-a2ui.md)** — the core idea, in plain
   language, with a tiny worked example before any real code.
2. **[02-component-catalog-and-rendering.md](./02-component-catalog-and-rendering.md)**
   — how a JSON tree becomes a React component tree: the catalog, the
   renderer, the message processor, and how a form "submit" turns into an
   event the rest of the system can react to.
3. **[03-workflow-engine.md](./03-workflow-engine.md)** — the multi-step
   "workflow" system that drives things like "Create Patient" (a 10-step
   wizard): what a workflow JSON file looks like, and the three server
   routes (`/api/workflow`, `/api/workflow/step`, `/api/workflow/submit`)
   that execute it.
4. **[04-validation-and-security.md](./04-validation-and-security.md)** —
   how form input is validated and transformed (Zod), and how permissions /
   authentication are enforced on every request.
5. **[05-rest-vs-graphql-transport.md](./05-rest-vs-graphql-transport.md)**
   — how a workflow action can talk to the backend over REST *or* GraphQL,
   why we added GraphQL support, and the automatic snake_case ⇄ camelCase
   conversion layer that makes both transports interchangeable from a single
   JSON file.
6. **[06-end-to-end-walkthrough.md](./06-end-to-end-walkthrough.md)** — one
   complete request, traced through *every* layer above, using the real
   `create_patient` workflow and real code from this repository.
7. **[07-debugging-case-study.md](./07-debugging-case-study.md)** — a
   real bug (`Field 'userId' of required type 'String!' was not provided`)
   that came up while building this, written up as a mystery-to-solution
   story. Useful for learning *how* to debug a system like this, not just
   what the system does.

## The one-paragraph summary

A **workflow** is a JSON file describing a wizard: a list of **steps**, each
step has a **UI schema** (what form to show) and one or more **actions**
(what HTTP or GraphQL call to make when the form is submitted). The **A2UI
renderer** turns the UI schema into real React components. When the user
submits a form, a **dispatch** event carries the form data to a server route
that validates it (**Zod**), executes the configured action (**REST fetch**
or **GraphQL request**), and returns the next step. Everything needed to
resume (the workflow definition, which step you're on, and all data
collected so far) is threaded through as a single JSON blob called
**`sessionContext`**, re-sent by the client on every request — the server
keeps no in-memory state between calls.
