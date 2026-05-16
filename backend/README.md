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

`npm run start:dev` uses polling mode for file watching so local development can still run on Linux environments that have a low inotify watcher limit. This is more resilient but can use slightly more CPU than native file watching.

## Environment

Create `backend/.env` by copying `backend/.env.example`, or use:

```bash
DATABASE_URL="postgresql://simple_account_user:simple_account_pass@localhost:15432/simple_account?schema=public"
PORT=3003
JWT_SECRET="your_highly_secret_key_change_in_production"
JWT_EXPIRATION="24h"
```

Use `SKIP_DB_CONNECT=true` when running tests or bootstrapping without a live database connection.

If you prefer native file watching on Linux, raise the inotify watcher limit and then you can switch the script back locally:

```bash
sudo sysctl fs.inotify.max_user_watches=524288
echo "fs.inotify.max_user_watches=524288" | sudo tee /etc/sysctl.d/99-simple-account.conf
sudo sysctl --system
```

## Local PostgreSQL

From the repo root:

```bash
docker compose up -d postgres
```
