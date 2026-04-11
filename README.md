# Simple Account

Backend-first ERP foundation focused on accounting workflows.

## Structure

```text
.
├── backend/        # NestJS API, Prisma schema, tests, and feature modules
├── docs/           # Architecture and product notes
├── graphify-out/   # Knowledge-graph output
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
│   ├── modules/    # Business modules
│   ├── app.module.ts
│   └── main.ts
├── test/           # Test helpers and integration tests
└── README.md
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
