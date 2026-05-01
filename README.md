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

```bash
# 1. Start the database
docker compose up -d postgres

# 2. Install all dependencies (root, backend, and frontend)
npm run install:all

# 3. Set up the backend environment file
cd backend
cp .env.example .env   # Windows: copy .env.example .env
# Edit backend/.env and set a strong JWT_SECRET before running in production

# 4. Generate Prisma client and run migrations
npm run prisma:generate
npm run prisma:migrate
cd ..
```

### Every Time You Run The Project

Start the database, then run both backend and frontend from the project root with a single command:

```bash
# Start the database (if not already running)
docker compose up -d postgres

# Start backend and frontend together from the project root
npm run dev
```

This uses `concurrently` to launch both services in the same terminal:

- **Backend** → `http://localhost:3003/api`
- **Frontend** → `http://localhost:3000`
- **Swagger docs** → `http://localhost:3003/api/docs`

If you prefer to run each service in a separate terminal:

```bash
# Terminal 1 — backend
cd backend && npm run start:dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

If you need to sync schema changes locally and `npm run prisma:migrate` fails with `P3006` (shadow database replay), run:

```bash
cd backend
npx prisma db push --skip-generate
```

### Database Only

From the backend folder, you can also start PostgreSQL with:

```bash
cd backend
npm run db:up
```

### Backend Setup Commands

Use these after dependency or schema changes:

```bash
cd backend
cp .env.example .env   # Windows: copy .env.example .env
npm install
npm run prisma:generate
# Use migrate for normal migration workflow.
# If migrate fails locally with P3006, use db push as a local fallback.
npm run prisma:migrate
# npx prisma db push --skip-generate
npm run start:dev
```

If Next.js reports a stale `.next` cache or `readlink` error, stop the frontend server and run:

```bash
# Linux/macOS
rm -rf frontend/.next

# Windows PowerShell
Remove-Item -Recurse -Force frontend\.next
```

Then restart with `npm run dev` from the project root (or `npm run dev` from inside `frontend/`).

### Prisma Studio

Start the database first, then run Prisma Studio from the backend folder:

```bash
cd backend
npm run prisma:studio
```

Prisma Studio usually opens at:

```text
http://localhost:5555
```

## Run Tests

### Backend Test Cases

Run the backend Jest test suite from the backend folder:

```bash
cd backend
npm test
```

To keep the backend tests running while you edit code:

```bash
cd backend
npm run test:watch
```

### Frontend Checks

The frontend does not currently have a test runner script. Use TypeScript checking to validate frontend code:

```bash
cd frontend
npm run typecheck
```

You can also run a production build check:

```bash
cd frontend
npm run build
```

## Troubleshooting

- If backend development startup fails with `EADDRINUSE`, check whether port `3003` is already in use before running `npm run start:dev`.
- The frontend production build currently succeeds, but it can still take noticeably longer on larger pages because Next.js compiles and validates the app during build.
- In frontend development mode, page navigation can feel slower than production because Next.js compiles routes on demand.
