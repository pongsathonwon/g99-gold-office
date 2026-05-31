# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**g99-gold-office** — Internal back-office system for a gold trading company. Tracks inventory, position, supplier orders, branch transfers, and smelting. Reads POS transaction data via watermark-based polling sync.

Full business context: `goldoffice_business_context_revised.md`
Full technical context: `technical_context.md`

---

## Commands

This is a pnpm monorepo. All commands are run from the repo root.

```bash
# Setup
pnpm install

# Development
docker-compose -f infra/docker-compose.yml up -d   # start Postgres dev DB
pnpm dev                                            # API + web dev servers

# Build
pnpm build

# Tests
pnpm test                    # all tiers
pnpm test --project=domain   # Tier 1 only (pure logic, instant, no infra)
pnpm test --project=adapters # Tier 2 (requires Docker)
pnpm playwright test         # Tier 4 E2E

# Migrations
pnpm db:migrate
pnpm db:seed
```

---

## Monorepo Layout

```
packages/
  @gold/domain      — branded types, enums, constants (GB_TO_GRAM, period boundary)
  @gold/contracts   — Zod schemas shared between API and web (single source of truth)
apps/
  api/src/
    core/[module]/
      domain/       — Pure Logic functions
      ports/        — Effect Tag interfaces
      use-cases/    — Orchestration functions
    adapters/
      db/postgres/  — dev Effect Layers
      db/mssql/     — prod Effect Layers
      http/         — @effect/platform route handlers
    infrastructure/ — DatabaseService, config, auth middleware
    main.ts         — composition root (only place that wires dev vs prod layers)
  web/src/
    features/       — one folder per domain module (mirrors api/core)
    shared/         — typed API client, auth hooks, shared components
infra/
  docker-compose.yml    — Postgres dev container
  migrations/           — plain SQL (both-DB compatible)
  scripts/sync/         — POS polling sync job
```

---

## Three Function Types — Strict Classification

Every function belongs to exactly one type. The type determines where it lives and how it's written.

### 1. Pure Logic — `core/[module]/domain/`
Plain TypeScript. No Effect wrapper. No I/O. Deterministic.

```typescript
export const calculateWeightedAverageCost = (lots: readonly InventoryLot[]): CostBasis => { ... }
export const assignToPeriod = (transactionAt: Date): PeriodId => { ... }
export const gbToGrams = (gb: GoldBaht): Grams => Grams.make(GoldBaht.value(gb) * GB_TO_GRAM)
```

### 2. Side Effect — `adapters/` or `infrastructure/`
Always returns `Effect<A, E, R>`. Never returns `(value, err)` tuples or throws. Error channel `E` must be a typed domain error class.

```typescript
const findByLotId = (id: LotId): Effect.Effect<InventoryLot, LotNotFoundError | PersistenceError, DatabaseService> =>
  Effect.tryPromise({ ... })
```

### 3. Orchestration — `core/[module]/use-cases/`
Composes Side Effect + Pure Logic via `Effect.gen`. Focuses on business flow.

```typescript
export const approveMutation = (id: MutationId, approvedBy: UserId) =>
  Effect.gen(function* () {
    const pending   = yield* pendingRepo.findById(id)           // Side Effect
    const validated = yield* Effect.fromEither(validateApproverIsUserA(approvedBy, pending)) // Pure Logic
    const approved  = buildApprovedMutation(validated, approvedBy, new Date()) // Pure Logic
    yield* inventoryRepo.save(approved)   // Side Effect
    yield* auditLogger.log(approved)      // Side Effect
  })
```

---

## Effect-TS Patterns

**Port** = `Context.Tag` interface in `core/[module]/ports/`
**Adapter** = `Layer.effect(...)` in `adapters/db/postgres/` or `adapters/db/mssql/`
**Composition root** = `main.ts` only — the one place that swaps `PostgresLive` vs `MssqlLive`

Domain errors use `Data.TaggedError`:
```typescript
export class LotNotFoundError extends Data.TaggedError("LotNotFoundError")<{ lotId: LotId }>() {}
export class PersistenceError extends Data.TaggedError("PersistenceError")<{ cause: unknown }>() {}
```

`Option<A>` = value that normally may not exist. `Effect<A, E>` failure = something went wrong and it should have existed. Don't conflate them.

---

## Database

- **Query builder:** Kysely (Postgres dev, MSSQL prod). No ORM.
- **No raw SQL outside `adapters/db/`** — port interfaces never reference SQL.
- **`inventory_mutations` is INSERT-only.** Never UPDATE or DELETE it. Current balances come from a materialised VIEW over this table.
- **Migration SQL must be least-common-denominator** (runs on both Postgres dev and MSSQL prod):

| Avoid | Use instead |
|---|---|
| `SERIAL` | `BIGINT GENERATED ALWAYS AS IDENTITY` |
| `BOOLEAN` | `BIT` |
| `NOW()` | `CURRENT_TIMESTAMP` |
| `RETURNING` | `OUTPUT` clause — isolate in MSSQL adapter |

- MSSQL-only concerns (`NOLOCK`, `OUTPUT`, `Thai_CI_AS` collation) stay in the MSSQL adapter only.

---

## POS Sync

SELECT-only access to POS MSSQL. Watermark polling with 10-minute delay (accepted).

Flow: POS MSSQL → `sync_staging` (append-only raw rows, never deleted) → domain tables (idempotent upsert keyed on POS PK).

Transformation between staging and domain tables is **Pure Logic** (deterministic, no I/O).

**Buy Service schema** (`HistBuy` + `BuyList`): `buyDate` + `buyTime` are split columns; `buyTime` is nvarchar — combine and treat as `Asia/Bangkok`. `buyStat = '0'` = cancelled (skip or void). Cross-table JOINs on Thai strings may need explicit `COLLATE` due to mixed collations (`Thai_100_CI_AI` vs `Thai_CI_AS`).

---

## Authentication

JWT payload: `{ sub, role: "USER_A"|"USER_B"|"USER_C"|"MANAGER", branch_id, exp }`

- Roles are stored in the GoldOffice DB, not the POS DB.
- Backend: Effect middleware layer injects role into Effect `Context`.
- Frontend: `<RoleGuard role="USER_A">` wraps protected routes.
- **No optimistic updates on inventory mutations.** Mutations require User A approval — show "pending approval" state instead.

---

## Frontend

| Concern | Decision |
|---|---|
| Framework | React + MUI |
| Server state | TanStack Query (30s polling) |
| UI state | Zustand (filters, modal open state only) |
| Real-time | WebSocket for current-period position dashboard only |
| Locale | MUI `LocalizationProvider` with `th` locale |
| Dates | MSSQL stores bare datetimes (no offset) — always treat as `Asia/Bangkok` |
| Filter state | URL-serialised via `useSearchParams` (7-dimension inventory filter is bookmarkable) |

---

## Testing Tiers

| Tier | What | Tool | Infra needed |
|---|---|---|---|
| 1 | Pure Logic (`core/*/domain/`) | Vitest | None |
| 2 | DB adapters | Vitest + testcontainers | Real Postgres Docker |
| 3 | Use-cases / orchestration | Vitest | Mocked Effect Layers |
| 4 | Critical approval flows only | Playwright | Full stack |

Write Tier 4 E2E only for the User A approval gate and the Friday period boundary reset.

---

## Key Constants

| Constant | Value | Notes |
|---|---|---|
| `GB_TO_GRAM` | `15.244` | Locked — never recalculate, always import from `@gold/domain/constants` |
| Period boundary | Friday 00:00 `Asia/Bangkok` | Business rule |
| Purity conversion | `1.036` (default) | **PENDING confirmation — H-01** |

---

## Open Risks (as of 2026-05-31)

| ID | Risk | Severity |
|---|---|---|
| R-02 | Auth permission matrix not yet defined | HIGH |
| R-03 | MSSQL bare datetimes (no offset) — app must treat all as `Asia/Bangkok`; tested invariant required | HIGH |
| R-04 | No MSSQL staging env — mitigated by 1-month parallel UAT | MEDIUM |
| R-05 | Opening balance import scope unclear (INV-007) | MEDIUM |
| R-07 | Thai collation conflicts on cross-table JOINs | MEDIUM |
| R-08 | Order Service (sale side) schema still undefined | HIGH |
