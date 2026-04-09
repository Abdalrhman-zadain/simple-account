# Backend

Phase 1 accounting foundation for the ERP system.

## Commands

```bash
npm install
npm run db:up
npm run prisma:generate
npm run prisma:migrate -- --name init_accounting_core
npm test
npm run start:dev
```

## Environment

Create `backend/.env` with:

```bash
DATABASE_URL="postgresql://simple_account_user:simple_account_pass@localhost:55432/simple_account?schema=public"
```

Use `SKIP_DB_CONNECT=true` when running tests or bootstrapping without a live database connection.

## Local PostgreSQL

From the repo root:

```bash
docker compose up -d postgres
```

Apply the initial schema:

```bash
cd backend
pnpm exec prisma migrate dev --name init_accounting_core
```

Inspect the database:

```bash
docker exec -it simple-account-postgres psql -U simple_account_user -d simple_account
```
