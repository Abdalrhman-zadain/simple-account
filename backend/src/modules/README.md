# Modules folder (NestJS)

This folder contains the business/domain modules for the backend. In NestJS, a feature is usually organized into a folder that includes a **controller**, **service**, **DTOs**, and sometimes **tests**.

## What is the difference between these files?

### `*.controller.ts` (Controller)
- Handles **HTTP requests** (API endpoints).
- Examples: `GET /accounts`, `POST /accounts`.
- Should be thin: read params/body, call the service, return a response.

### `*.service.ts` (Service)
- Contains the **business logic**.
- Usually does the real work: validation, calculations, rules, and database calls (often via `PrismaService`).
- The controller calls the service.

### `dto/` (Data Transfer Objects)
- DTOs define the **shape of data** your API expects (request body) or returns.
- Common examples:
  - `create-*.dto.ts` (fields required to create)
  - `update-*.dto.ts` (fields allowed to update)
- Often used with validation (e.g., `class-validator`) to make sure user input is correct.

### `*.spec.ts` (Tests)
- Unit tests (usually Jest) for your controller/service.
- Not used when the app runs normally.
- Run with commands like `pnpm test`.

## Example (Accounts module)
For example, in `accounting-core/accounts/` you may see:
- `accounts.controller.ts` → API endpoints for accounts
- `accounts.service.ts` → business logic for accounts
- `dto/` → request/response DTOs like `create-account.dto.ts`
- `accounts.service.spec.ts` → tests for the service
