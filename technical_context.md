# GoldOffice — Technical Context

> Last updated: 2026-06-01 · Complements `goldoffice_business_context_revised.md`

---

## 1. Infrastructure

| Concern   | Dev                  | Prod                                     |
| --------- | -------------------- | ---------------------------------------- |
| Database  | PostgreSQL in Docker | On-premise MSSQL                         |
| DB access | Full (own container) | App credentials only; no POS code access |
| POS data  | N/A                  | SELECT-only on POS MSSQL tables          |

- Dev environment runs `docker-compose up` from `infra/docker-compose.yml`
- Schema migrations use plain SQL files (Flyway or golang-migrate) — both tools support Postgres and MSSQL
- Dev → Prod cutover requires a MSSQL staging environment test before any production run

---

## 2. Architecture

### Pattern: Modular Monolith + Hexagonal (Ports & Adapters)

**Not Event Sourcing.** Reasoning: 1–2 developer team; full Event Sourcing adds ~40–60% overhead before writing business logic. The audit trail requirement is fully satisfied by an append-only `inventory_mutations` table (INSERT-only, never UPDATE/DELETE). Current balances are derived as a VIEW over that table. This structure is migration-compatible with Event Sourcing if the business scales.

### Hexagonal Zones

```
┌─────────────────────────────────────────────┐
│  DRIVING SIDE                                │
│  @effect/platform HTTP routes               │
│  (Side Effect functions)                     │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  APPLICATION CORE                            │
│  Ports (Effect Tag interfaces)               │
│  Use Cases (Orchestration functions)         │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  DOMAIN CORE                         │   │
│  │  Pure Logic — plain TypeScript       │   │
│  │  No Effect, no I/O                   │   │
│  └─────────────────────────────────────┘   │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  DRIVEN SIDE                                 │
│  DB / Cache / Sync adapters                  │
│  (Side Effect functions — Effect Layers)     │
└─────────────────────────────────────────────┘
```

Modules communicate only through defined port interfaces. No cross-domain direct database queries.

---

## 3. Monorepo Layout

```
g99-gold-office/
├── pnpm-workspace.yaml
├── packages/
│   ├── domain/          # @gold/domain — branded types, constants, enums
│   │   └── src/
│   │       ├── types/       # GoldBaht, LotId, Purity, ...
│   │       └── constants/   # GB_TO_GRAM = 15.244 (locked)
│   └── contracts/       # @gold/contracts — Zod schemas for API I/O (shared by API + web)
├── apps/
│   ├── api/             # Effect-TS backend
│   │   └── src/
│   │       ├── core/
│   │       │   └── [module]/        # inventory, position, trade, transfer, smelting, master-data
│   │       │       ├── domain/      # Pure Logic functions
│   │       │       ├── ports/       # Effect Tag interfaces (port definitions)
│   │       │       └── use-cases/   # Orchestration functions
│   │       ├── adapters/
│   │       │   ├── db/
│   │       │   │   ├── postgres/    # dev Effect Layers
│   │       │   │   └── mssql/       # prod Effect Layers
│   │       │   └── http/            # @effect/platform route handlers
│   │       ├── infrastructure/      # DatabaseService, config, logging, auth middleware
│   │       └── main.ts              # composition root — only place that wires layers
│   └── web/             # React + MaterialUI SPA
│       └── src/
│           ├── features/   # one folder per domain
│           └── shared/     # typed API client, auth hooks, shared components
└── infra/
    ├── docker-compose.yml    # postgres dev container
    ├── migrations/           # plain SQL (both-DB compatible)
    └── scripts/sync/         # POS polling sync job
```

---

## 4. Coding Style — Three Function Types

Every function belongs to exactly one of three types.

### Pure Logic

Plain TypeScript. No Effect wrapper. No I/O. Deterministic given same inputs. Sits in `core/[module]/domain/`.

```typescript
export const calculateWeightedAverageCost = (lots: readonly InventoryLot[]): CostBasis => {
  const totalWeight = lots.reduce((sum, l) => sum + l.weightGb, 0)
  const totalCost   = lots.reduce((sum, l) => sum + l.totalCostThb, 0)
  if (totalWeight === 0) return CostBasis.zero()
  return CostBasis.make(totalCost / totalWeight)
}

export const assignToPeriod = (transactionAt: Date): PeriodId => { ... }

export const gbToGrams = (gb: GoldBaht): Grams =>
  Grams.make(GoldBaht.value(gb) * GB_TO_GRAM)
```

### Side Effect

Always returns `Effect<A, E, R>`. **Never** returns `(value, err)` tuples or throws. Error channel `E` is a typed domain error class. Sits in `adapters/` or `infrastructure/`.

```typescript
const findByLotId = (
  id: LotId,
): Effect.Effect<
  InventoryLot,
  LotNotFoundError | PersistenceError,
  DatabaseService
> =>
  Effect.tryPromise({
    try: () => db.query<InventoryLotRow>("SELECT ...", [id]),
    catch: (e) => new PersistenceError({ cause: e }),
  }).pipe(
    Effect.flatMap((row) =>
      row
        ? Effect.succeed(mapRowToLot(row))
        : Effect.fail(new LotNotFoundError({ id })),
    ),
  );
```

### Orchestration

Composes Side Effect + Pure Logic using `Effect.gen`. Focuses on business flow, not technical detail. Sits in `core/[module]/use-cases/`.

```typescript
export const approveMutation = (id: MutationId, approvedBy: UserId) =>
  Effect.gen(function* () {
    const pending = yield* pendingRepo.findById(id); // Side Effect
    const validated = yield* Effect.fromEither(
      validateApproverIsUserA(approvedBy, pending), // Pure Logic
    );
    const approved = buildApprovedMutation(validated, approvedBy, new Date()); // Pure Logic
    yield* inventoryRepo.save(approved); // Side Effect
    yield* auditLogger.log(approved); // Side Effect
  });
```

---

## 5. Effect-TS Patterns

### Port = Tag + Context interface

```typescript
// core/inventory/ports/InventoryRepository.ts
export interface InventoryRepository {
  findByLotId: (id: LotId) => Effect.Effect<InventoryLot, LotNotFoundError>;
  save: (lot: InventoryLot) => Effect.Effect<void, PersistenceError>;
  findByDimensions: (
    filter: StockFilter,
  ) => Effect.Effect<InventoryLot[], PersistenceError>;
}

export class InventoryRepository extends Context.Tag("InventoryRepository")<
  InventoryRepository,
  InventoryRepository
>() {}
```

### Adapter = Layer

```typescript
// adapters/db/postgres/InventoryRepositoryPostgres.ts
export const InventoryRepositoryPostgresLive = Layer.effect(
  InventoryRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService
    return {
      findByLotId:      (id)     => Effect.tryPromise({ ... }),
      save:             (lot)    => Effect.tryPromise({ ... }),
      findByDimensions: (filter) => Effect.tryPromise({ ... }),
    }
  })
)
```

### Composition root (dev vs prod swap = one line)

```typescript
// apps/api/src/main.ts
const Dependencies =
  process.env.NODE_ENV === "production"
    ? InventoryRepositoryMssqlLive
    : InventoryRepositoryPostgresLive;

Effect.runPromise(
  HttpServer.serve(appRouter).pipe(Effect.provide(Dependencies)),
);
```

### Domain errors = tagged Data classes

```typescript
export class LotNotFoundError extends Data.TaggedError("LotNotFoundError")<{
  lotId: LotId;
}>() {}
export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  userId: UserId;
  requiredRole: Role;
}>() {}
export class InsufficientStockError extends Data.TaggedError(
  "InsufficientStockError",
)<{ requested: GoldBaht; available: GoldBaht }>() {}
export class PersistenceError extends Data.TaggedError("PersistenceError")<{
  cause: unknown;
}>() {}
```

### Option vs Effect failure

- `Option<A>` — value might not exist and that is normal (e.g., optional config)
- `Effect<A, E>` failure — value should exist but something went wrong (use domain error in `E`)

---

## 6. Database Strategy

- **Query builder:** Kysely — type-safe, first-class Postgres and MSSQL dialects, no ORM magic
- **No raw SQL outside adapters** — port interfaces never reference SQL; all queries stay in `adapters/db/`
- **Least-common-denominator SQL** (applies to migration files):

| Avoid       | Use instead                                        |
| ----------- | -------------------------------------------------- |
| `SERIAL`    | `BIGINT GENERATED ALWAYS AS IDENTITY`              |
| `BOOLEAN`   | `BIT`                                              |
| `NOW()`     | `CURRENT_TIMESTAMP`                                |
| `RETURNING` | `OUTPUT` clause (MSSQL) — isolate in MSSQL adapter |

- **MSSQL-only concerns stay in MSSQL adapter:** `NOLOCK` hints, `OUTPUT` clause, collation (`Thai_CI_AS`)
- **Core schema invariant:** `inventory_mutations` is INSERT-only. No UPDATE, no DELETE. Current balances are a materialised VIEW.

---

## 7. POS Data Sync

Data source: POS production MSSQL (SELECT-only access, no POS source code).

**Sync delay (R-01 resolved):** Electronic recording is owned by the POS team. A 10-minute sync delay is accepted — real-time position accuracy is bounded by this lag.

```
POS MSSQL (SELECT-only)
      │
      │  Scheduled polling — watermark = last processed row ID / updated_at
      ▼
sync_staging schema       ← append-only raw POS rows; never deleted; marked processed=true after use
      │
      │  Pure Logic transformation (deterministic, no I/O)
      ▼
GoldOffice domain tables  ← idempotent upsert keyed on POS row primary key
```

Sync orchestration (Effect-TS):

```typescript
const syncFromPOS = Effect.gen(function* () {
  const watermark = yield* WatermarkRepository.getLatest(); // Side Effect
  const rawRows = yield* PosReadAdapter.fetchSince(watermark); // Side Effect
  const events = rawRows.map(transformPosRowToTransaction); // Pure Logic
  yield* StagingRepository.saveAll(rawRows); // Side Effect
  yield* PositionTransactionRepository.upsertAll(events); // Side Effect
  yield* WatermarkRepository.save(getMaxWatermark(rawRows)); // Side Effect
});
```

---

## 8. HTTP Layer

Framework: `@effect/platform` (`HttpRouter`, `HttpServer`). Route handlers are Effect programs — no impedance mismatch.

Request/response shapes: Zod schemas in `@gold/contracts` package. Both the backend (for validation) and the frontend (for typed API client) import from the same package. Single source of truth.

---

## 9. Authentication

| Concern              | Decision                                                                          |
| -------------------- | --------------------------------------------------------------------------------- |
| Mechanism            | JWT with role claim                                                               |
| Roles                | `USER_A \| USER_B \| USER_C \| MANAGER`                                           |
| Role storage         | `users` table in GoldOffice DB (not POS)                                          |
| Legacy link          | `users.empl_code` → `EmplInfo.emplCode` (natural key, no FK constraint in prod)   |
| Backend enforcement  | Effect middleware layer; role injected into Effect `Context`                      |
| Frontend enforcement | `<RoleGuard role="USER_A">` wrapping protected routes                             |

JWT payload:

```typescript
{
  sub: string;
  role: "USER_A" | "USER_B" | "USER_C" | "MANAGER";
  branch_id: string;
  exp: number;
}
```

**No optimistic updates on inventory mutations.** Mutations require User A approval — show "pending approval" state in the UI instead.

---

## 10. Frontend Architecture

| Concern      | Decision                                                                            |
| ------------ | ----------------------------------------------------------------------------------- |
| Framework    | React + MaterialUI                                                                  |
| Server state | TanStack Query (polling 30s for non-realtime screens)                               |
| UI state     | Zustand (filters, modal open state only)                                            |
| Real-time    | WebSocket for current-period position dashboard only                                |
| Locale       | MUI `LocalizationProvider` with `th` locale                                         |
| Dates        | Prod MSSQL stores bare datetimes (no `+07:00`); treat all as `Asia/Bangkok` — see R-03 |
| Filter state | URL-serialised via `useSearchParams` (7-dimension inventory filter is bookmarkable) |

Feature folder structure mirrors domain modules: `features/position/`, `features/inventory/`, `features/trade/`, etc.

---

## 11. Testing Strategy

| Tier | What                          | Tool                    | Infrastructure                 |
| ---- | ----------------------------- | ----------------------- | ------------------------------ |
| 1    | Pure Logic (`core/*/domain/`) | Vitest                  | None — plain function calls    |
| 2    | Side Effect adapters          | Vitest + testcontainers | Real Postgres Docker container |
| 3    | Orchestration use-cases       | Vitest                  | Mock Effect Layers             |
| 4    | Critical approval flows only  | Playwright              | Full stack                     |

Tier 1 runs in milliseconds with no setup. Tier 2 tests the Postgres adapter; the port abstraction means MSSQL only needs dialect-specific tests. Write E2E (Tier 4) only for the User A approval gate and the Friday period boundary reset.

---

## 12. Open Risks

| ID   | Risk                                                                                                                                          | Severity | Status                    | Blocking          |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------- | ----------------- |
| R-01 | **D-01 resolved:** electronic recording owned by POS team; 10-min sync delay accepted                                                        | LOW      | Resolved                  | Position domain   |
| R-02 | **Auth design not started:** roles `USER_A/B/C + MANAGER` confirmed, permission matrix not yet defined                                        | HIGH     | Open                      | All domains       |
| R-03 | **Timezone — confirmed risk:** prod MSSQL stores bare datetimes (no offset); app must treat all as `Asia/Bangkok` — tested invariant required | HIGH     | Confirmed, not resolved   | Position domain   |
| R-04 | **No MSSQL staging:** mitigated by 1-month parallel UAT (old workflow + this system run simultaneously before cutover)                        | MEDIUM   | Mitigated                 | Prod deploy       |
| R-05 | **Opening balance import (INV-007):** branch-to-HQ lot transfer out of scope; initial HQ lot import scope unclear                             | MEDIUM   | Partially open            | Inventory go-live |
| R-06 | **Pending mutations alerting:** in-app badge accepted as day-one solution                                                                     | LOW      | Accepted                  | Inventory domain  |
| R-07 | **Thai collation:** `Thai_CI_AS` required; Buy Service tables use mixed collations — watch cross-table JOINs on Thai strings                  | MEDIUM   | Accepted / watch          | Prod deploy       |
| R-08 | **Buy Service schema documented** (see §13); Order Service (sale side) contract still undefined                                               | HIGH     | Partially resolved        | Position domain   |

---

## 13. Buy Service Integration (R-08)

Source: other team's MSSQL DB. SELECT-only. Schema confirmed for gold bar purchases only. Order Service (sale side) schema not yet defined.

### `HistBuy` — one row per buy transaction

| Column           | Type       | Collation        | Nullable | Notes                                            |
| ---------------- | ---------- | ---------------- | -------- | ------------------------------------------------ |
| `buyNumb`        | nvarchar   | Thai_100_CI_AI   | NO       | Running number — PK                              |
| `buyDate`        | datetime2  | —                | YES      | Date portion only                                |
| `buyTime`        | nvarchar   | Thai_100_CI_AI   | YES      | Time stored as string — combine with `buyDate`, treat as `Asia/Bangkok` |
| `emplCode`       | nvarchar   | Thai_100_CI_AI   | YES      | FK → EmplInfo.emplCode                           |
| `branchCode`     | nvarchar   | Thai_100_CI_AI   | YES      |                                                  |
| `changeNumb`     | nvarchar   | Thai_100_CI_AI   | YES      | Nullable                                         |
| `buyStat`        | varchar    | Thai_100_CI_AI   | YES      | `'1'` = active · `'0'` = cancelled (soft-delete) |
| `custCode`       | nvarchar   | Thai_100_CI_AI   | YES      |                                                  |
| `expireDok`      | float      | —                | YES      |                                                  |
| `pawnExpirePrice`| float      | —                | YES      |                                                  |
| `buyRemark`      | nvarchar   | Thai_100_CI_AS   | YES      |                                                  |
| `pictureURL`     | nvarchar   | Thai_CI_AS       | YES      |                                                  |

### `BuyList` — line items per transaction

| Column       | Type     | Collation      | Nullable | Notes                                    |
| ------------ | -------- | -------------- | -------- | ---------------------------------------- |
| `id`         | int      | —              | NO       | PK                                       |
| `buyNumb`    | nvarchar | Thai_100_CI_AI | YES      | FK → HistBuy.buyNumb                     |
| `typeCode`   | nvarchar | Thai_100_CI_AI | YES      | `'8'` = gold bar (ทองแท่ง)               |
| `laiCode`    | nvarchar | Thai_CI_AS     | YES      | Gold bar size — see lookup below         |
| `compCode`   | nvarchar | Thai_100_CI_AI | YES      |                                          |
| `goodWeight` | float    | —              | YES      |                                          |
| `barBuyPrice`| float    | —              | YES      |                                          |
| `buyPrice`   | float    | —              | YES      |                                          |
| `goldType`   | nvarchar | Thai_100_CI_AI | YES      |                                          |
| `buyRemark`  | nvarchar | Thai_100_CI_AI | YES      |                                          |

### Lookup values

| `laiCode` | Description  |
| --------- | ------------ |
| 158       | ทองแท่ง 10 บาท |
| 2879      | ทองแท่ง 20 บาท |
| 616       | ทองแท่ง 5 บาท  |
| 9935      | ทองแท่ง 50 บาท |

### Sync considerations

- `buyDate` + `buyTime` are split columns; `buyTime` is nvarchar — parse and combine into a single timestamp, then apply `Asia/Bangkok` offset
- `buyStat = '0'` means cancelled — sync must handle soft-delete (do not import or mark as void in staging)
- Cross-table JOINs on Thai string columns risk collation conflicts (`Thai_100_CI_AI` vs `Thai_CI_AS`) — use explicit `COLLATE` if needed

---

## Key Constants (Never Recalculate)

| Constant                 | Value                       | Source                                          |
| ------------------------ | --------------------------- | ----------------------------------------------- |
| `GB_TO_GRAM`             | `15.244`                    | Locked master record — `@gold/domain/constants` |
| Period boundary          | Friday 00:00 `Asia/Bangkok` | Business rule                                   |
| Purity conversion factor | `1.036` (default)           | **PENDING confirmation — H-01**                 |
