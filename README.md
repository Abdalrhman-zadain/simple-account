# Simple Account

Backend-first ERP foundation focused on accounting workflows.

## Structure

```text
.
├── backend/        # NestJS API, Prisma schema, tests, and Phase 1/domain modules
├── frontend/       # Next.js app router, feature slices, and shared UI
├── docs/           # Architecture and product notes
├── docker-compose.yml
├── AGENTS.md
└── README.md
```

## Backend Structure

```text
backend/
├── prisma/         # Database schema and migrations
├── src/
│   ├── common/     # Shared infrastructure such as Prisma
│   ├── generated/  # Prisma generated client
│   ├── modules/    # Platform + Phase 1 accounting modules
│   ├── app.module.ts
│   └── main.ts
├── test/           # Test helpers and integration tests
└── README.md
```

## Frontend Structure

```text
frontend/
├── app/            # Route groups and route entrypoints
├── features/       # Feature-owned screens and flows
├── components/ui/  # Reusable UI primitives
├── lib/            # API, config, and shared utilities
├── providers/      # Global providers
└── types/          # Shared API types
```

## Docs

- `docs/erp-structure.md`
- `docs/full-stack.md`
- `docs/design.md`

## Run

```bash
docker compose up -d postgres
cd backend
npm install
npm run prisma:generate
npm run start:dev
```
