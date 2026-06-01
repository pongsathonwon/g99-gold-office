# GoldOffice — Features & Acceptance Criteria

> Source of truth: `goldoffice_business_context_revised.md` · Codebase: `g99-gold-office`
> Last updated: 2026-06-01

---

## Table of Contents

1. [Master Data](#1-master-data)
2. [Inventory Domain](#2-inventory-domain)
3. [Position Domain](#3-position-domain)
4. [Supplier Orders](#4-supplier-orders)
5. [Transfer Out (HQ → Branch)](#5-transfer-out-hq--branch)
6. [POS Sync](#6-pos-sync)

---

## 1. Master Data

### MDT-001 — Gold Product Catalogue

**Roles:** Manager (manage), all roles (read)

| Field                     | Constraint                                              |
| ------------------------- | ------------------------------------------------------- |
| Product type              | ทองแท่ง / ทองแผ่น / รูปพรรณ                             |
| `supplier_tradeable` flag | Configurable — not hard-coded                           |
| Fee structure             | Spread only / Spread+ค่าบล็อค / Spread+ค่าแรง+ค่ากำเน็จ |

**Acceptance Criteria**

- AC-1: Given a product type record, when the `supplier_tradeable` flag is toggled, then the change is persisted and the new value is immediately reflected in supplier order creation forms.
- AC-2: Given any user, when they view the product catalogue, then all three product types are listed with their correct fee structures and `supplier_tradeable` status.
- AC-3: Given a non-Manager role, when they attempt to create or edit a product type, then the request is rejected with an authorization error.

---

### MDT-002 — Gold Bar Size Registry

**Roles:** Manager (manage), all roles (read)

| Size  | Status |
| ----- | ------ |
| 5 GB  | Active |
| 10 GB | Active |
| 20 GB | Active |
| 50 GB | Active |

**Acceptance Criteria**

- AC-1: Given the bar size registry, when queried, then all four sizes (5 / 10 / 20 / 50 GB) are returned with `active = true`.
- AC-2: Given two lots with the same brand, purity, and product type but different bar sizes, when fulfilling an order, then they are treated as fungible substitutes.
- AC-3: Given a ฮั่วเซ็งเฮ็ง lot, when fulfilling an order that does not specify ฮั่วเซ็งเฮ็ง, then ฮั่วเซ็งเฮ็ง stock is NOT used as a substitute.

---

### MDT-003 — Brand Registry

**Roles:** Manager (manage), all roles (read)

| Brand        | Notes                                     |
| ------------ | ----------------------------------------- |
| ฮั่วเซ็งเฮ็ง | Non-fungible flag required                |
| AU           | Generic                                   |
| Inter        | Generic                                   |
| HQ Smelted   | System-assigned only; not user-selectable |
| Other        | Catch-all                                 |

**Acceptance Criteria**

- AC-1: Given the brand registry, when a new inventory lot is being created, then "HQ Smelted" is NOT available as a user-selectable option — it may only be assigned by the system on smelting output.
- AC-2: Given brand "ฮั่วเซ็งเฮ็ง", when the non-fungible flag is set, then the system prevents any substitution of this brand with any other brand during order fulfillment.
- AC-3: Given a brand change request from a non-Manager user, when submitted, then the request is rejected.

---

### MDT-004 — GB-to-Gram Conversion Factor (Locked)

**Roles:** Read-only for all; change requires controlled process

**Acceptance Criteria**

- AC-1: Given any weight conversion (GB → grams or grams → GB), when the calculation runs, then it uses exactly `1 GB = 15.244 g` imported from `@gold/domain/constants`, never an inline literal.
- AC-2: Given a direct attempt to edit the conversion factor via the API, when submitted by any user, then the request is rejected with a `LockedMasterDataError`.
- AC-3: Given any inventory lot record, when weight is stored, then both GB and gram values are present and satisfy `grams = gb × 15.244` within floating-point tolerance.

---

### MDT-005 — Branch & HQ Registry

**Roles:** Manager (manage), all roles (read)

**Acceptance Criteria**

- AC-1: Given a branch record, when created, then it includes: branch ID, name, distance tier (Near/Mid/Far → 3/5/7-day expected transit window), and `active` status.
- AC-2: Given an inactive branch, when a new transfer order targets it, then the order is rejected with a validation error.
- AC-3: Given the HQ record, when queried, then it is distinguishable from branch records (e.g. `is_hq = true`).

---

### MDT-006 — Supplier Registry

**Roles:** Manager (manage), User C (read), all roles (read)

**Acceptance Criteria**

- AC-1: Given a supplier record, when created, then it includes: name, gold types supplied, brand-locked flag, and commission rates per product type.
- AC-2: Given a supplier with `brand_locked = true`, when a buy order is created for that supplier, then the order's brand field is auto-populated and locked to that supplier's brand.
- AC-3: Given an inactive supplier, when a new order is created for them, then the order is rejected with a validation error.

---

### MDT-007 — Daily Gold Market Price

**Roles:** Manager (enter), all roles (read)

**Acceptance Criteria**

- AC-1: Given a Manager, when they submit a market price entry, then the record stores: price value (THB/GB), date/time, and entered-by user ID.
- AC-2: Given a market price entry, when it is written to the database, then it is tagged as a valuation input and structurally prevented from being used as a cost basis input.
- AC-3: Given multiple price entries on the same day, when queried for the current price, then the most recent entry by timestamp is returned.

---

### MDT-007 — Inventory Target per Purity ("Magic Number") _(INV-NEW-01)_

**Roles:** Manager (manage), User A (read)

**Acceptance Criteria**

- AC-1: Given a Manager, when they update the 96.5% purity target (expressed in GB), then the previous value, new value, changed-by user ID, and timestamp are recorded in an audit log.
- AC-2: Given a Manager, when they update the 99.99% purity target (expressed in grams), then the same audit trail as AC-1 is created.
- AC-3: Given any user viewing the inventory dashboard, when targets are set, then the display shows: target, actual total held, and variance (actual − target) for each purity.
- AC-4: Given a threshold breach (actual < target or actual > target), when displayed, then no automated action is triggered — the dashboard shows the variance as decision support only.

---

### MDT-NEW-01 — Purity Price Conversion Factor (Pending)

> **[PENDING — H-01]** Status: awaiting confirmation of whether 1.036 is stable or variable.

**Acceptance Criteria (stable variant)**

- AC-1: Given the factor is confirmed stable, when stored, then it is a locked master record (same rules as MDT-004 — not editable without controlled change process).
- AC-1 (alt): Given the factor is confirmed variable, when a new value is entered daily by Manager, then a dated record is created (same structure as MDT-007).

---

## 2. Inventory Domain

### INV-001 — Seven-Dimension Lot View

**Roles:** User A (manage), Manager (read)

> Implementation: `apps/api/src/core/inventory/ports/InventoryRepository.ts` — `findByFilter`

**Acceptance Criteria**

- AC-1: Given inventory lots exist, when the user applies a filter for any single dimension (product type, purity, brand, bar size, location, stock state, lot ID), then only matching lots are returned.
- AC-2: Given inventory lots exist, when the user applies any combination of two or more dimensions simultaneously, then the result is the intersection (AND) of all applied filters.
- AC-3: Given a lot record, when displayed, then all seven dimensions are visible on the same row.
- AC-4: Given no filter is applied, when the full list is requested, then all lots across all dimensions are returned.

---

### INV-002 — Stock State Separation

**Roles:** User A (manage), Manager / User B / User C (read)

**Acceptance Criteria**

- AC-1: Given lots in multiple stock states (Available, Reserved, In-Transit, Pending Transformation), when the inventory screen is rendered, then each state is displayed as a separate group — never aggregated into a single figure.
- AC-2: Given a lot in `Reserved` state, when the system calculates allocatable stock, then Reserved lots are excluded.
- AC-3: Given a lot in `In-Transit` state, when displayed, then it counts toward total gold held but is NOT allocatable to new sales or transfers.
- AC-4: Given a stock state transition (e.g. Available → Reserved), when User A approves it, then the prior state is no longer shown in the original state bucket and the new state appears immediately.

---

### INV-003 — Lot ID Enforcement

**Roles:** User A (enforce at approval time)

> Implementation: branded type `LotId` in `packages/domain/src/types/index.ts`

**Acceptance Criteria**

- AC-1: Given any attempt to create or update an inventory mutation record, when the `lot_id` field is absent or null, then the operation is rejected with a validation error before it reaches the database.
- AC-2: Given an approved inventory lot, when queried, then the `lot_id` links back to the source transaction (buy order, transfer, or manual input) that originated it.
- AC-3: Given two lots with the same product dimensions but different source transactions, when stored, then they have distinct `lot_id` values.

---

### INV-004 — Dual-Unit Weight Storage

**Roles:** All (weight is always displayed in both units)

**Acceptance Criteria**

- AC-1: Given any inventory lot, when stored, then both `weight_gb` and `weight_grams` fields are present and non-null.
- AC-2: Given a lot with `weight_gb = N`, when `weight_grams` is computed, then `weight_grams = N × 15.244` (using the locked constant from `@gold/domain/constants`).
- AC-3: Given a lot with 99.99% purity (supplier unit = grams), when displayed to a user, then both grams and the GB equivalent are shown.

---

### INV-005 — Pending Mutation Queue & Approval Gate

**Roles:** User A (approve/reject), User B / User C (submit mutations)

> Implementation: `apps/api/src/core/inventory/use-cases/approveMutation.ts`

**Acceptance Criteria**

- AC-1: Given a pending mutation in the queue, when User A approves it, then the corresponding inventory lot is created or updated and the mutation record transitions to `approved`.
- AC-2: Given a pending mutation, when a User B or User C calls the approve endpoint, then the system returns `UnauthorizedError` and no inventory record is changed.
- AC-3: Given User A rejects a mutation with a reason, when the rejection is processed, then the mutation transitions to `rejected`, the reason is stored, and the original inventory state is unchanged.
- AC-4: Given a pending mutation, when displayed in the queue, then the source context is visible (which order or receipt triggered it, who requested it, and when).
- AC-5: Given no optimistic update is attempted on the frontend, when a mutation is submitted, then the UI shows a "pending approval" state until User A acts.

---

### INV-006 — Weighted Average Cost Basis per Lot

**Roles:** User A (cost data flows from approved orders/mutations)

> Implementation: `apps/api/src/core/inventory/domain/costBasis.ts` — `calculateWeightedAverageCost`

**Acceptance Criteria**

- AC-1: Given multiple lots of the same product type, purity, and brand, when WAC pooling is applied, then `cost_per_gb_thb = Σ(lot_cost) / Σ(lot_weight_gb)` using actual transaction costs only.
- AC-2: Given a WAC calculation, when the current gold market price differs from the WAC, then the market price is NOT used in the cost calculation — only actual transaction costs.
- AC-3: Given lots across different brands (e.g. AU and ฮั่วเซ็งเฮ็ง), when WAC is calculated, then they are pooled separately — brand pools are never mixed.
- AC-4: Given lots across different purity grades (96.5% and 99.99%), when WAC is calculated, then they are pooled separately — purity pools are never mixed.

---

### INV-007 — Opening Balance Import

**Roles:** User A (enter balances at go-live)

**Acceptance Criteria**

- AC-1: Given a go-live import, when opening balances are entered, then each balance creates a `PendingMutation` of type `opening_balance` that User A self-approves.
- AC-2: Given an opening balance lot, when stored, then it carries: weight (GB and grams), cost basis (actual historical cost entered by User A), all seven dimensions, and the date of opening balance.
- AC-3: Given an imported opening balance, when queried in the audit log, then it is distinguishable from operational mutations (source type = `opening_balance`).

---

### INV-005-DASH — Inventory Dashboard — Strategy Visual Distinction

> Formerly INV-005 in requirements index.

**Acceptance Criteria**

- AC-1: Given the inventory dashboard, when rendered, then ทองแท่ง lots are visually distinguished from ทองแผ่น and รูปพรรณ lots (e.g. separate sections or colour coding) to reflect the different holding strategies.

---

### INV-006-BRANCH — Branch Stock Visibility from HQ

> Formerly INV-006 in requirements index.

**Acceptance Criteria**

- AC-1: Given stock held at a branch, when an HQ user views the inventory, then branch stock is visible with location dimension = branch ID.
- AC-2: Given the HQ inventory view, when filtered by `location = HQ`, then branch stock is excluded.

---

## 3. Position Domain

### POS-PER-001 — Period Definition & Boundary

**Roles:** System (enforced), all roles (read)

> Implementation: `apps/api/src/core/position/domain/period.ts` — `assignToPeriod`, `getPeriodStart`

**Acceptance Criteria**

- AC-1: Given a transaction timestamp, when `assignToPeriod` runs, then the returned `PeriodId` equals the most recent Friday 00:00 `Asia/Bangkok` on or before the timestamp.
- AC-2: Given a transaction assigned to a period, when the period ID is written to the database, then it is immutable — no update path exists for it.
- AC-3: Given a timestamp of exactly Friday 00:00:00 `Asia/Bangkok`, when assigned, then it belongs to the NEW period starting that instant (not the prior period).
- AC-4: Given a timestamp of Thursday 23:59:59 `Asia/Bangkok`, when assigned, then it belongs to the period that started the PREVIOUS Friday.
- AC-5: Given any period, when its boundary is computed, then the period spans exactly Fri 00:00 → Thu 23:59 with no overlap with adjacent periods.

---

### POS-PER-002 — Net Period Calculation

**Roles:** Manager, User C (view), system (compute)

**Acceptance Criteria**

- AC-1: Given all transactions for a period, when Net Cash is computed, then `Net Cash = Σ Cash IN − Σ Cash OUT` (positive = company received cash).
- AC-2: Given all transactions for a period, when Net Gold 96.5% is computed, then `Net Gold 96.5% = Σ GB received − Σ GB given out`.
- AC-3: Given all transactions for a period, when Net Gold 99.99% is computed, then `Net Gold 99.99% = Σ grams received − Σ grams given out`.
- AC-4: Given branch ↔ HQ transfer transactions, when any period net figure is computed, then those transactions are excluded from all three net calculations.
- AC-5: Given negative net values, when displayed, then negative sign is shown clearly (e.g. company gave out more than it received).

---

### POS-PER-003 — Period History Report

**Roles:** Manager, User C (view)

**Acceptance Criteria**

- AC-1: Given completed periods, when the period report is queried, then each Fri–Thu period appears as exactly one row.
- AC-2: Given a monthly query, when rendered, then 4–5 period rows are returned (matching the number of Fri–Thu periods in the month).
- AC-3: Given period rows, when displayed, then they are NOT auto-summed — each row stands alone.
- AC-4: Given a filter for product type (ทองแท่ง / ทองแผ่น / รูปพรรณ), when applied to the report, then each period row disaggregates into the selected product type's contribution.

---

### POS-PER-004 — Current Period Dashboard

**Roles:** Manager, User C (view)

**Acceptance Criteria**

- AC-1: Given the dashboard is open, when rendered, then it shows the in-progress Fri–Thu period's Net Cash, Net Gold 96.5%, and Net Gold 99.99% figures.
- AC-2: Given a new transaction is recorded, when the dashboard is polled (within 30 seconds), then the net figures update to include the new transaction.
- AC-3: Given Friday 00:00 `Asia/Bangkok` passes, when the dashboard refreshes, then all three net figures reset to zero and the new period's ID is displayed.

---

### POS-006 — Period Alert on Threshold Breach

**Roles:** Manager (configure), Manager (receive alerts)

**Acceptance Criteria**

- AC-1: Given a configurable threshold (e.g. Net Gold 96.5% > 500 GB or < −500 GB), when a transaction causes the current period net to cross that threshold, then an alert is displayed on the management dashboard.
- AC-2: Given a threshold configuration, when saved by Manager, then the threshold value, direction (above/below), and configured-by user are recorded.
- AC-3: Given an alert triggered, when the net figure moves back within the threshold, then the alert indicator is cleared.
- AC-4: Given no threshold is configured for a net figure, when that figure changes, then no alert is generated.

---

### POS-007 — Paper Contract / Customer Order Tracking

**Roles:** User C (record), Manager (view)

**Acceptance Criteria**

- AC-1: Given an outstanding paper contract (gold reserved for a customer at a fixed price), when recorded, then it is tracked electronically with: customer reference, product type, weight (GB and grams), agreed price, and reservation date.
- AC-2: Given a paper contract, when fulfilled (gold physically delivered), then its status transitions to `fulfilled` and it is excluded from open contract counts.
- AC-3: Given outstanding contracts, when viewed, then the display location (dashboard vs separate fulfilment screen) follows the outcome of open decision **D-POS**.

---

## 4. Supplier Orders

### SUP-BUY-001 — Create Supplier Buy Order

**Roles:** User C (create), Manager (read)

> Implementation: `apps/api/src/core/trade/ports/SupplierOrderRepository.ts` — `createBuyOrder`

**Acceptance Criteria**

- AC-1: Given User C, when they submit a buy order, then the order is saved with: supplier ID, product type, weight (gram/kilogram), agreed price per unit, order timestamp, and `created_by = User C ID`.
- AC-2: Given a non-User-C role, when they submit a buy order creation request, then the request is rejected with an authorization error.
- AC-3: Given a new buy order, when saved, then its initial status is `placed`.
- AC-4: Given a supplier with `brand_locked = true`, when a buy order is created for them, then the order's brand is auto-populated from the supplier's brand and cannot be overridden.

---

### SUP-BUY-002 — Supplier Delivering & User B Arrival Confirmation

**Roles:** User B (confirm arrival)

**Acceptance Criteria**

- AC-1: Given a buy order in `placed` status, when User B marks it as delivering, then the status transitions to `supplier_delivering`.
- AC-2: Given a buy order in `supplier_delivering` status, when User B confirms physical arrival at HQ, then the status transitions to `user_b_confirmed` and a `PendingMutation` (type = `buy_order_increment`) is created for User A.
- AC-3: Given a non-User-B role, when they attempt to confirm arrival, then the request is rejected with an authorization error.
- AC-4: Given a User B confirmation, when the pending mutation is created, then it carries: buy order ID, supplier, weight, cost basis from the order, and User B ID.

---

### SUP-BUY-003 — User A Approves Inventory Increment (Buy)

**Roles:** User A (approve/reject)

**Acceptance Criteria**

- AC-1: Given a pending mutation of type `buy_order_increment`, when User A approves it, then the corresponding inventory lot is created with: all seven dimensions, weight (GB and grams), cost basis from the buy order, and the lot ID linked to the order.
- AC-2: Given User A approval, when processed, then the buy order status transitions to `user_a_approved`.
- AC-3: Given User A rejection, when processed, then the pending mutation transitions to `rejected`, the rejection reason is stored, and no inventory lot is created.

---

### SUP-BUY-004 — Close Buy Order

**Roles:** System (auto-close on approval)

**Acceptance Criteria**

- AC-1: Given a buy order in `user_a_approved` status, when the approval is processed, then the order status automatically transitions to `closed`.
- AC-2: Given a closed buy order, when queried, then it is read-only — no further status transitions are possible.

---

### SUP-SELL-001 — Create Supplier Sell Order

**Roles:** User C (create), Manager (read)

> Implementation: `apps/api/src/core/trade/ports/SupplierOrderRepository.ts` — `createSellOrder`

**Acceptance Criteria**

- AC-1: Given User C, when they submit a sell order, then the order is saved with: supplier ID, product type, weight (gram/kilogram), agreed sell price per unit, order timestamp, and `created_by = User C ID`.
- AC-2: Given a new sell order, when saved, then its initial status is `placed`.
- AC-3: Given a ทองแผ่น sell order, when created, then a `commission_thb` field is included as a separate line item (not merged into the sell price).
- AC-4: Given a non-User-C role, when they submit a sell order creation, then the request is rejected.

---

### SUP-SELL-002 — Gold Dispatched → User A Approved → Closed

**Roles:** User B (dispatched), User A (approve)

**Acceptance Criteria**

- AC-1: Given a sell order in `placed` status, when User B marks gold as dispatched, then the status transitions to `gold_dispatched` and a `PendingMutation` (type = `sell_order_decrement`) is created for User A.
- AC-2: Given User A approves the decrement, when processed, then the matching inventory lot's quantity is reduced, the lot ID is recorded on the sell order, and the order transitions to `user_a_approved` then `closed`.
- AC-3: Given User A rejects the decrement, when processed, then the sell order reverts to `placed` and no inventory is changed.

---

### SUP-SELL-003 — Sheet Gold Commission as Separate P&L Line

**Roles:** System (record), Manager (view)

**Acceptance Criteria**

- AC-1: Given a ทองแผ่น supplier sell order, when finalized, then `commission_thb` is stored as a separate field (not deducted from `sell_price_per_unit`).
- AC-2: Given a P&L or order report, when rendered, then ทองแผ่น commission appears as its own line distinct from the sale proceeds.

---

## 5. Transfer Out (HQ → Branch)

### TRF-001 — Create Transfer Order

**Roles:** System (triggered by Customer Order domain, other team)

> Implementation: `apps/api/src/core/transfer/ports/TransferRepository.ts` — `create`

**Acceptance Criteria**

- AC-1: Given a customer order requiring branch fulfillment, when a transfer order is created, then it stores: customer order reference, gold bar items (brand, size, purity, quantity), dispatch date, expected arrival date, origin (HQ), and destination (branch ID).
- AC-2: Given a transfer order, when created, then its initial status is `order_created`.
- AC-3: Given the creating event, when processed, then no inventory mutation is triggered at creation time.

---

### TRF-002 — HQ Dispatch (User B)

**Roles:** User B (dispatch), User A (approve decrement)

**Acceptance Criteria**

- AC-1: Given a transfer order in `order_created` status, when User B marks it as dispatched, then the status transitions to `hq_dispatched` and a `PendingMutation` (type = `transfer_hq_decrement`) is created for User A.
- AC-2: Given a non-User-B role, when they attempt to mark as dispatched, then the request is rejected.
- AC-3: Given User A approves the HQ decrement mutation, when processed, then the HQ inventory lot's quantity decreases and an `In-Transit` lot is created with origin, destination, transfer ID, and dispatch date.
- AC-4: Given User A rejects the HQ decrement, when processed, then the transfer order reverts to `order_created` and HQ inventory is unchanged.

---

### TRF-003 — Branch Receipt Confirmation (User B)

**Roles:** User B at branch (confirm), User A (approve increment)

**Acceptance Criteria**

- AC-1: Given a transfer in `hq_dispatched` status, when User B confirms branch receipt, then the status transitions to `branch_received` and a `PendingMutation` (type = `transfer_branch_increment`) is created for User A.
- AC-2: Given User A approves the branch increment, when processed, then the branch inventory gains a new `Available` lot with all seven dimensions, and the `In-Transit` lot is removed.
- AC-3: Given User A rejects the branch increment, when processed, then the transfer order remains in `hq_dispatched`, the `In-Transit` lot persists, and branch inventory is unchanged.
- AC-4: Given the branch increment, when approved, then it is treated as a separate approval from the HQ decrement (two independent User A actions).

---

### TRF-004 — Customer Delivery Confirmation (User B)

**Roles:** User B at branch (confirm)

**Acceptance Criteria**

- AC-1: Given a transfer in `branch_received` status, when User B confirms customer delivery, then the status transitions to `customer_received`.
- AC-2: Given the `customer_received` transition, when processed, then no inventory mutation is triggered (the decrement already happened at HQ dispatch).
- AC-3: Given a completed transfer, when queried, then the full status history (timestamps and actors for each transition) is accessible.

---

### TRF-005 — Full Status Lifecycle

**Acceptance Criteria**

- AC-1: Given a transfer order, when progressing through its lifecycle, then it must follow exactly: `order_created → hq_dispatched → branch_received → customer_received`. No steps may be skipped.
- AC-2: Given a transfer in any status, when a backward transition is attempted (e.g. `branch_received → hq_dispatched`), then the request is rejected with a domain error.
- AC-3: Given a closed (customer_received) transfer, when queried, then it is read-only.

---

## 6. POS Sync

### SYNC-001 — Watermark-Based Polling with 10-Minute Delay

**Roles:** System (automated job)

**Acceptance Criteria**

- AC-1: Given the sync job runs, when it queries the POS MSSQL, then it reads only rows with a PK or timestamp greater than the last saved watermark.
- AC-2: Given the sync job runs, when it fetches new rows, then rows with `transaction_time > now() - 10 minutes` are excluded (accepted 10-minute lag).
- AC-3: Given a successful sync run, when complete, then the watermark is advanced to the highest PK/timestamp processed.
- AC-4: Given a failed sync run (e.g. network error), when retried, then the watermark is NOT advanced — the same rows are re-fetched and processed idempotently.

---

### SYNC-002 — Append-Only Staging Table

**Roles:** System (write), audit (read)

**Acceptance Criteria**

- AC-1: Given a sync run, when raw POS rows are written to `sync_staging`, then the write is append-only — no existing rows are updated or deleted.
- AC-2: Given the same POS row arriving in two separate sync runs, when inserted into `sync_staging`, then the insert is idempotent (keyed on POS primary key) — no duplicate rows.
- AC-3: Given `sync_staging`, when queried at any time, then it contains the complete raw history of all rows ever synced, in insertion order.

---

### SYNC-003 — Idempotent Upsert into Domain Tables

**Roles:** System (automated transformation)

**Acceptance Criteria**

- AC-1: Given a staged row, when the domain upsert runs, then the transformation from `sync_staging` to domain tables is **Pure Logic** (deterministic, no I/O side effects in the transform function itself).
- AC-2: Given the same staged row is processed twice, when both upserts complete, then the domain table contains exactly one record keyed on the POS primary key — no duplicates.
- AC-3: Given a domain upsert, when the record already exists (same POS PK), then the upsert updates non-key fields if they differ (idempotent update path).

---

### SYNC-004 — Buy Service Date/Time Normalization

**Roles:** System (automated transformation)

**Acceptance Criteria**

- AC-1: Given a `HistBuy` row, when the sync transform runs, then `buyDate` (date column) and `buyTime` (nvarchar column) are combined into a single `DateTime` value.
- AC-2: Given the combined datetime value, when stored in the domain table, then it is treated as `Asia/Bangkok` timezone (no offset is stored in MSSQL — always interpret as Bangkok local time).
- AC-3: Given `buyTime` containing invalid or null values, when the transform runs, then the row is flagged as a sync error (not silently dropped) and the watermark is NOT advanced past it.

---

### SYNC-005 — Cancelled Transaction Handling

**Roles:** System (automated transformation)

**Acceptance Criteria**

- AC-1: Given a POS row where `buyStat = '0'`, when the sync transform processes it, then the row is either skipped (not inserted into the domain table) or inserted with status `void`.
- AC-2: Given a previously synced row that is later cancelled (`buyStat` changes to `'0'` on a subsequent sync), when the upsert runs, then the domain record is updated to `void` status and excluded from position calculations.
- AC-3: Given a voided transaction, when position net figures are computed, then that transaction does NOT contribute to Net Cash, Net Gold 96.5%, or Net Gold 99.99%.

---

## Appendix — Out-of-Scope Features

| Feature                                       | Reason                                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| หลอมทอง (Smelting) domain — full workflow     | Out of scope. Inventory only receives manual User A input for smelting output volume and cost. |
| Branch → HQ transfer domain                   | Out of scope. Inventory receives manual User A input.                                          |
| Per-transaction P&L (FIFO / average)          | Future phase.                                                                                  |
| Overnight carry / EOD mark-to-market          | Moot with weekly net model.                                                                    |
| Supplier API / price feed API                 | All orders and prices are manual.                                                              |
| Speculative orders blended with customer flow | Out of scope by design.                                                                        |

---

_GoldOffice · Features & Acceptance Criteria · v1.0 · 2026-06-01_
