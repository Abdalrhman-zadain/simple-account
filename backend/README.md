# Backend

NestJS backend for the accounting foundation.

## Source Layout

```text
src/
├── common/         # Shared infrastructure
├── generated/      # Prisma generated client
├── modules/
│   ├── accounting-core/
│   └── auth/
├── app.module.ts
└── main.ts
```

## Commands

```bash
npm install
cp .env.example .env
npm run db:up
npm run prisma:generate
npm run prisma:migrate -- --name init_accounting_core
npm test
npm run start:dev
```

## Environment

Create `backend/.env` by copying `backend/.env.example`, or use:

```bash
DATABASE_URL="postgresql://simple_account_user:simple_account_pass@localhost:15432/simple_account?schema=public"
PORT=3003
JWT_SECRET="your_highly_secret_key_change_in_production"
JWT_EXPIRATION="24h"
```

Use `SKIP_DB_CONNECT=true` when running tests or bootstrapping without a live database connection.

## Local PostgreSQL

From the repo root:

```bash
docker compose up -d postgres
```
