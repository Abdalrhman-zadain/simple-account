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

## Run Locally

### First Time Setup

From the project root:

```powershell
cd C:\Users\Dell\OneDrive\Desktop\work_project\simple-account
docker compose up -d postgres
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
cd ..\frontend
npm install
```

### Every Time You Run The Project

Open one terminal for the database:

```powershell
cd C:\Users\Dell\OneDrive\Desktop\work_project\simple-account
docker compose up -d postgres
```

Open a second terminal for the backend:

```powershell
cd C:\Users\Dell\OneDrive\Desktop\work_project\simple-account\backend
npm run start:dev
```

The backend runs at:

```text
http://localhost:3001/api
```

Swagger docs are available at:

```text
http://localhost:3001/api/docs
```

Open a third terminal for the frontend:

```powershell
cd C:\Users\Dell\OneDrive\Desktop\work_project\simple-account\frontend
npm run dev
```

The frontend runs at:

```text
http://localhost:3000
```

### Database Only

From the backend folder, you can also start PostgreSQL with:

```powershell
cd backend
npm run db:up
```

### Backend Setup Commands

Use these after dependency or schema changes:

```powershell
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run start:dev
```

If Next.js reports a stale `.next` cache or `readlink` error, stop the frontend server and run:

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

### Prisma Studio

Start the database first, then run Prisma Studio from the backend folder:

```powershell
cd backend
npm run prisma:studio
```

Prisma Studio usually opens at:

```text
http://localhost:5555
```
