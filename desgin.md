## Architecture Overview

### Modular Monolith Pattern

A single deployable unit organized into independent, feature-based modules. Each module encapsulates a business domain and can be developed, tested, and reasoned about in isolation.

**Benefits:**

- Easier refactoring than distributed services
- Simpler debugging and development experience
- Fast inter-module communication (function calls)
- Single deployment pipeline
- Path to microservices later (extract module → standalone service)
  `

**Module Characteristics:**

- Each module has its own entities, controllers, services, DTOs
- Modules communicate through public service interfaces only
- Internal implementation details are hidden
- Database tables can be logically grouped by module
- Clear dependency direction (avoid circular dependencies)

---

### 3-Tier Architecture

The application is organized into three distinct layers:

```
┌─────────────────────────────────────────┐
│   PRESENTATION TIER (Frontend)          │
│   Next.js, React, UI Components         │
└──────────────┬──────────────────────────┘
               │ HTTP/REST/GraphQL
┌──────────────▼──────────────────────────┐
│   BUSINESS LOGIC TIER (Backend)         │
│   NestJS, Services, Controllers         │
└──────────────┬──────────────────────────┘
               │ SQL Queries
┌──────────────▼──────────────────────────┐
│   DATA ACCESS TIER (Database)           │
│   Prisma ORM, PostgreSQL                │
└─────────────────────────────────────────┘
```

#### Tier 1: Presentation Tier

**Location:** `frontend/` (Next.js application)

**Responsibilities:**

- Render UI components and pages
- Handle user interactions and input validation
- Make HTTP requests to backend APIs
- Manage local state (forms, UI state)
- Display data in user-friendly formats

**Key Components:**

- Pages (routes and layouts)
- React components (buttons, forms, tables)
- Custom hooks (useQuery, useMutation)
- Client-side validation with Zod
- HTTP client (fetch/axios with TanStack Query)

**Example Flow:**

```
User Input → Form Validation → API Call → State Update → Re-render
```

#### Tier 2: Business Logic Tier

**Location:** `backend/src/` (NestJS application)

**Responsibilities:**

- Process requests from frontend
- Implement business rules and workflows
- Coordinate between modules
- Handle authentication and authorization
- Validate data integrity
- Transform data for persistence or response

**Key Components:**

- **Controllers** - Handle HTTP requests, route to services
- **Services** - Implement business logic
- **DTOs** - Define request/response shapes
- **Guards** - Enforce authentication/authorization
- **Pipes** - Validate and transform data
- **Middleware** - Cross-cutting concerns (logging, etc.)

**Example Architecture:**

```
Controller (HTTP endpoint)
    ↓
Guard (verify user is authenticated)
    ↓
Service (business logic, call repositories)
    ↓
Repository (query database via Prisma)
    ↓
Database Result → Transform → Response DTO → HTTP Response
```

#### Tier 3: Data Access Tier

**Location:** `backend/prisma/` and database queries

**Responsibilities:**

- Define data schema and relationships
- Execute database queries
- Ensure data consistency and integrity
- Manage migrations and schema changes
- Handle transactions

**Key Components:**

- **Prisma Schema** - TypeScript-friendly schema definition
- **Migrations** - Version-controlled schema changes
- **Database Constraints** - Foreign keys, unique constraints, checks
- **Indexes** - Performance optimization

**Example Data Model:**

```prisma
model Account {
  id            Int
  code          String  @unique
  name          String
  type          AccountType

  transactions  Transaction[]

  created_at    DateTime
  updated_at    DateTime
}

model Transaction {
  id            Int
  account_id    Int
  amount        Decimal
  description   String

  account       Account  @relation(fields: [account_id])

  created_at    DateTime
}
```

---

### Data Flow Examples

#### Example 1: Create a Journal Entry

```
Frontend (User fills form)
    ↓
POST /api/transactions
    ↓
TransactionController.create()
    ↓
AuthGuard (verify user)
    ↓
CreateTransactionDTO validation
    ↓
TransactionService.create()
    ↓
- Validate business rules (balance check)
- Create related Account movements
- Calculate P&L impact
    ↓
TransactionRepository.create()
    ↓
Prisma (execute INSERT with relations)
    ↓
PostgreSQL (store with constraints)
    ↓
Response with created transaction DTO
    ↓
Frontend (update UI, show success)
```

#### Example 2: Fetch Financial Report

```
Frontend (user requests P&L report)
    ↓
GET /api/reports/profit-loss?period=2024-01
    ↓
ReportController.getProfitLoss()
    ↓
ReportService.getProfitLoss()
    ↓
- Query transactions for period
- Group by account type
- Calculate totals
- Format response
    ↓
Multiple database queries via Prisma
    ↓
PostgreSQL (aggregate and return)
    ↓
Transform raw data to ReportDTO
    ↓
Frontend receives JSON
    ↓
React renders tables/charts
```

---

### Module Dependencies

**Allowed directions:**

```
auth ← all other modules (everyone needs auth)
common ← all modules (utilities shared everywhere)
accounts ← transactions, reports
transactions → accounts (create transactions against accounts)
reports ← accounts, transactions, invoices
```

**Forbidden:**

- Circular dependencies (A → B → A)
- Reports calling Invoices directly if logic should be in centeral service
- Skipping authentication/authorization layers

---

### Database Design Principles

1. **Normalization** - Minimize data duplication
2. **Constraints** - Use foreign keys, unique constraints
3. **Audit Trail** - created_at, updated_at on all tables
4. **Soft Deletes** - deleted_at instead of hard delete for financial data
5. **Transactions** - Multi-row operations use database transactions
6. **Indexing** - Index frequently queried columns

---

### Deployment Topology

```
Docker Container
├── Frontend (Next.js)
│   ├── Static assets
│   └── API routes (optional)
├── Backend (NestJS)
│   ├── Controllers
│   ├── Services
│   └── Prisma client
└── PostgreSQL (separate or same container)
```

This modular monolith approach allows the team to work independently on modules while maintaining a cohesive application, with a clear 3-tier separation providing structure and maintainability.
