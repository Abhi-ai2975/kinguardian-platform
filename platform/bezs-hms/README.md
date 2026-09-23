# drgodly

A telemedicine platform frontend and orchestration layer, built on
[Next.js](https://nextjs.org) App Router. It coordinates patient intake,
appointments, consultations, and clinical records on top of an external
FHIR server, IAM/auth service, and AI agents — see
[ARCHITECTURE.md](./ARCHITECTURE.md) for how the pieces fit together.

## Getting started

See [CONTRIBUTING.md](./CONTRIBUTING.md) for prerequisites, forking/cloning,
running the app locally with Docker + Postgres, and code conventions.

Quick version:

```bash
git clone https://github.com/<your-username>/drgodly.git
cd drgodly
pnpm install
docker compose -f docker-compose.dev.yml up -d
cp .env.example .env
pnpm db:generate && pnpm db:push
pnpm dev
```

Open [http://localhost:4000](http://localhost:4000) to see the app.

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — system design, module layout, external services
- [CONTRIBUTING.md](./CONTRIBUTING.md) — local setup, conventions, PR process
- [SECURITY.md](./SECURITY.md) — reporting vulnerabilities

## Learn more about Next.js

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
