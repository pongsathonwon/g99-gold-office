# GoldOffice — Business Context (Revised)

> Synthesised from Sessions 1–4 · Scope revised per architectural review · May 2026
> Status markers: **[CONFIRMED]** | **[PENDING]** | **[OUT OF SCOPE]** | **[OPEN DECISION]**

---

## Table of Contents

1. [Business Model](#1-business-model)
2. [Domain Architecture](#2-domain-architecture)
3. [Approval Chains](#3-approval-chains)
4. [Scope Boundaries](#4-scope-boundaries)
5. [Position Domain](#5-position-domain)
6. [Inventory Domain](#6-inventory-domain)
7. [Transfer Out Domain (HQ → Branch)](#7-transfer-out-domain-hq--branch)
8. [Supplier Order Domains](#8-supplier-order-domains)
9. [Gold Product Taxonomy](#9-gold-product-taxonomy)
10. [Cost Basis Principle](#10-cost-basis-principle)
11. [Master Data](#11-master-data)
12. [Open Decisions](#12-open-decisions)
13. [Requirement Index](#13-requirement-index)

---

## 1. Business Model

### Core Mechanism

The business captures **price spread** between buying gold from customers and covering via supplier orders. Spread per transaction: 50–200 THB per Gold Baht (GB). All supplier orders are placed manually by phone or LINE — no API integration exists or is planned.

### Dual Strategy

|                        | Strategy 1 — Spread Capture | Strategy 2 — Margin Capture                            |
| ---------------------- | --------------------------- | ------------------------------------------------------ |
| **Products**           | ทองแท่ง (Gold Bar)          | ทองแผ่น, รูปพรรณ                                       |
| **Margin Source**      | 50–200 THB/GB spread        | ค่าบล็อค ~100 THB/GB; ค่าแรง + ค่ากำเน็จ ~1,000 THB/GB |
| **Supplier Tradeable** | YES — high liquidity        | ทองแผ่น: YES (higher commission); รูปพรรณ: NO          |
| **Holding Goal**       | Minimise uncovered exposure | Deliberate hold for margin                             |

### What the System Does

| Domain                  | Purpose                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Position / Trading View | Read-only decision support for management. Shows net weight and net value of customer and supplier transactions within the current weekly period. |
| Inventory               | Asset ledger. Tracks how much gold the company holds, where, in what state, and at what cost. Carries over continuously between periods.          |

> These two domains share source data but are **independent calculations**. They must not be conflated.

---

## 2. Domain Architecture

### User Roles & Domain Ownership

| User        | Role                | Domain Ownership                                                                                               |
| ----------- | ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **User A**  | Inventory Keeper    | Sole mutator of inventory. Approves ALL stock mutations. No other user writes to inventory.                    |
| **User B**  | Physical Gatekeeper | Confirms supplier gold arrived at HQ (Receiving). Packs and dispatches gold out to branches (Transfer Out).    |
| **User C**  | Trade Manager       | Creates supplier buy orders and supplier sell orders based on position view. Manages customer order decisions. |
| **Manager** | Read-Only Oversight | Access to all readable views. Does not mutate data or issue orders.                                            |

### Domain Map

```
┌──────────────────────────────────────────────────────────────────────┐
│                    ORDER / TRANSACTION LAYER                          │
│                                                                       │
│  Buy Service       Customer Order    Supplier Buy    Supplier Sell   │
│  (buy-from-         (other team)      Order           Order           │
│   customer)                           [User C]        [User C]        │
└────────┬────────────────┬─────────────────┬───────────────┬──────────┘
         │                │                 │               │
         └────────────────┴──────┬──────────┴───────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        POSITION DOMAIN                                │
│              Read-only · Manager + User C view                        │
│         Net Cash · Net Gold 96.5% · Net Gold 99.99%                  │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐  ┌───────────────────────────────┐
│       RECEIVING  [User B]        │  │   TRANSFER OUT  [User B]      │
│                                 │  │                               │
│ · Supplier gold arrives at HQ   │  │ · Customer order triggers     │
│ · User B confirms physical      │  │   dispatch                    │
│   receipt                       │  │ · User B packs gold bar       │
│ · Triggers pending mutation     │  │ · Manages delivery status     │
│   for User A to approve         │  │ · Branch / customer receipt   │
│                                 │  │   confirmation                │
└────────────────┬────────────────┘  └───────────────┬───────────────┘
                 │                                   │
                 └──────────────┬────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                 APPROVAL GATE — USER A                                │
│       Reviews all pending mutations · Approves or rejects            │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       INVENTORY DOMAIN  [User A only]                 │
│                                                                       │
│  · Single source of truth for stock balances                          │
│  · All mutations require User A approval                              │
│  · Chooses supplier order → fires increment / decrement               │
│  · Manual input: smelting output, branch→HQ transfer                 │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Approval Chains

User A is the **universal final approver** for every inventory mutation. No domain writes directly to inventory — they propose; User A commits.

| Flow                   | Initiator                   | Physical Gate                             | User A Action                |
| ---------------------- | --------------------------- | ----------------------------------------- | ---------------------------- |
| Buy from supplier      | User C creates order        | User B confirms arrival at HQ             | Approves increment           |
| Sell to supplier       | User C creates order        | Order fulfilled                           | Approves decrement           |
| Transfer out to branch | Customer order (other team) | User B confirms branch / customer receipt | Approves decrement           |
| Smelting output        | —                           | —                                         | Manual input + self-approves |
| Branch → HQ transfer   | —                           | —                                         | Manual input + self-approves |

> The inventory domain exposes a **queue of pending mutations**, each with source context (which order, which receipt, who requested). User A reviews and approves. Full audit trail is a natural consequence.

---

## 4. Scope Boundaries

### ✅ In Scope

| Domain                   | What is included                                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Position Domain          | Read-only weekly net view. Net Cash, Net Gold 96.5%, Net Gold 99.99% per Fri–Thu period. Subscribes to all order domains.                                         |
| Inventory Domain         | Stock balance ledger. Seven-dimension tracking. Mutation queue with User A approval gate. Manual input for smelting output and branch→HQ transfer.                |
| Supplier Buy Order       | Documentation system for orders placed to supplier. User C initiates. Inventory chooses order to fire increment.                                                  |
| Supplier Sell Order      | Documentation system for sell-back orders. User C initiates. Inventory chooses order to fire decrement.                                                           |
| Receiving                | User B confirms physical arrival of supplier gold at HQ. Triggers pending mutation for User A to approve.                                                         |
| Transfer Out (HQ→Branch) | Gold bar dispatch to branch. Order status lifecycle: Created → HQ Dispatched → Branch Received → Customer Received. Fires inventory decrement on User A approval. |
| Buy Service              | Buy-from-customer transaction recording. Developed by other team. Position domain subscribes.                                                                     |
| Customer Order           | Sell-to-customer order system. Developed by other team. Position domain subscribes. Transfer Out domain reads for fulfillment.                                    |
| Master Data              | Product types, bar sizes, brands, branches, suppliers, GB-to-gram conversion, gold market price.                                                                  |

### ❌ Out of Scope

| Feature                                       | Reason / Notes                                                                                                                                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **หลอมทอง (Smelting) domain**                 | Entire workflow excluded: work orders, dispatch, status tracking, weight loss calculation, cost derivation, settlement. Inventory only receives manual input of smelting output volume and cost from User A. |
| **Branch → HQ Transfer domain**               | Inbound transfer workflow excluded. Inventory receives manual input from User A for gold brought from branch to HQ.                                                                                          |
| Per-transaction position matching             | Removed in Session 4. Weekly net model replaces per-transaction open/close states.                                                                                                                           |
| Overnight carry / EOD mark-to-market          | Moot with weekly net model.                                                                                                                                                                                  |
| Per-transaction P&L (FIFO / average)          | Too complex for current phase. Separate future module.                                                                                                                                                       |
| Supplier API integration                      | All orders manual by phone / LINE.                                                                                                                                                                           |
| Gold price feed API                           | Market price entered manually by manager.                                                                                                                                                                    |
| Speculative orders blended with customer flow | Must remain a separate module if ever built.                                                                                                                                                                 |

---

## 5. Position Domain

> **[CONFIRMED]** — POS-PER-001 to POS-PER-004. Read-only domain. No mutations originate here.

### Period Definition **[CONFIRMED — POS-PER-001]**

- One period = **Friday 00:00 → Thursday 23:59**
- Periods are discrete and non-overlapping
- Every transaction is assigned to a period at recording time — **immutable**
- No carryover between periods

### Net Period Calculation **[CONFIRMED — POS-PER-002]**

Three independent signed figures per period. **Positive = company gained that resource. Negative = company gave it out.**

| Figure                  | Formula                                                                      |
| ----------------------- | ---------------------------------------------------------------------------- |
| Net Cash (THB)          | Σ Cash IN (customers + suppliers) − Σ Cash OUT (to customers + to suppliers) |
| Net Gold 96.5% (GB)     | Σ GB received − Σ GB given                                                   |
| Net Gold 99.99% (grams) | Σ grams received − Σ grams given                                             |

> Internal transfers (branch ↔ HQ) are **excluded** from all three calculations.

### Transaction Types Included

| Transaction                     | Cash Dir. | Gold Dir. | Included In         |
| ------------------------------- | --------- | --------- | ------------------- |
| Customer sells gold TO company  | OUT       | IN        | Net Customer Orders |
| Customer buys gold FROM company | IN        | OUT       | Net Customer Orders |
| Company buys FROM supplier      | OUT       | IN        | Net Company Orders  |
| Company sells TO supplier       | IN        | OUT       | Net Company Orders  |
| Branch ↔ HQ transfer            | None      | Internal  | **EXCLUDED**        |

### Two Views

#### Management Dashboard — current period only **[CONFIRMED — POS-PER-004]**

- Shows current in-progress Fri–Thu period
- Updates in real time as transactions are recorded
- Resets to zero automatically each **Friday 00:00**
- Displays: Net Cash, Net Gold 96.5% (GB), Net Gold 99.99% (grams)

#### Period Report — historical rows **[CONFIRMED — POS-PER-003]**

- Each Fri–Thu period = one discrete row
- Monthly query returns 4–5 rows
- Rows are not automatically summed — each is standalone
- Disaggregatable by product type (ทองแท่ง / ทองแผ่น / รูปพรรณ)

### Period Alert **[CONFIRMED — POS-006, SHOULD]**

System alerts manager when current period Net Gold or Net Cash crosses a configurable threshold in either direction. Magnitude-based, not time-based.

---

## 6. Inventory Domain

> **[CONFIRMED]** — INV-001 to INV-007, INV-NEW-01. User A is the sole mutator.

### Seven Required Dimensions **[CONFIRMED — INV-001]**

Every stock record must be addressable by all seven dimensions simultaneously. All inventory screens must support filtering by any combination.

| Dimension          | Values                                                     | Rule                                 |
| ------------------ | ---------------------------------------------------------- | ------------------------------------ |
| Product Type       | ทองแท่ง / ทองแผ่น / รูปพรรณ                                | Required on every record             |
| Purity             | 96.5% / 99.99%                                             | Required. Pools NEVER mixed          |
| Brand              | ฮั่วเซ็งเฮ็ง / AU / Inter / HQ Smelted / Other             | Required. ฮั่วเซ็งเฮ็ง NOT fungible  |
| Bar Size (ทองแท่ง) | 5 / 10 / 20 / 50 GB                                        | Required for ทองแท่ง                 |
| Location           | Branch ID / HQ / In-Transit                                | Required. Determines transfer status |
| Stock State        | Available / Reserved / In-Transit / Pending Transformation | See below                            |
| Lot ID             | Batch identifier linking stock to source transaction       | Required — cost basis enforcement    |

### Stock States **[CONFIRMED — INV-002]**

> Available, Reserved, and In-Transit totals must **NEVER** be combined into a single figure. Each state is always displayed separately.

| State                  | Trigger                                   | Description                                                          |
| ---------------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| Available              | Stock received and confirmed              | On-hand. Allocatable to sales or transfers.                          |
| Reserved               | Customer order / paper contract issued    | Committed to customer at fixed price. Not available for other sales. |
| In-Transit             | Dispatched; receipt not yet confirmed     | Between locations. Counts toward total but not allocatable.          |
| Pending Transformation | Smelting work order opened (manual input) | At smelter. Input lot tracked; output not yet entered.               |

### Inflow Sources

| Source                        | How it enters inventory                          | User A Action                         |
| ----------------------------- | ------------------------------------------------ | ------------------------------------- |
| Buy from customer             | Buy Service transaction                          | Approves increment                    |
| Buy from supplier             | Supplier Buy Order + User B receipt confirmation | Approves increment from pending queue |
| HQ→Branch receipt (at branch) | Transfer Out domain confirms branch receipt      | Approves increment at branch          |
| Smelting output               | Manual input by User A (volume + cost)           | Self-approves                         |
| Branch→HQ transfer            | Manual input by User A (volume + cost)           | Self-approves                         |

### Outflow Sources

| Source             | How it leaves inventory            | User A Action                         |
| ------------------ | ---------------------------------- | ------------------------------------- |
| Sell to customer   | Customer Order fulfillment         | Approves decrement                    |
| Sell to supplier   | Supplier Sell Order                | Approves decrement from pending queue |
| HQ→Branch dispatch | Transfer Out domain dispatch event | Approves decrement at HQ              |

### Inventory Target — "Magic Number" **[CONFIRMED — INV-NEW-01]**

- **96.5% target** expressed in Gold Baht (GB)
- **99.99% target** expressed in grams
- Dashboard displays: target, actual total held, variance (actual − target)
- Decision-support only — **no automated actions** on breach
- Target changes are audit-logged: previous value, new value, changed by, timestamp

---

## 7. Transfer Out Domain (HQ → Branch)

> Gold bar only in current scope.

### Trigger

A customer order (from Customer Order domain, other team) requires fulfillment. Branch has insufficient stock. Customer pays at branch; order is recorded. HQ must dispatch gold bar to fulfill.

### Status Lifecycle

| Status            | Inventory Effect                         | Actor                              |
| ----------------- | ---------------------------------------- | ---------------------------------- |
| Order Created     | None                                     | Customer Order system (other team) |
| HQ Dispatched     | HQ stock ↓ (pending User A approval)     | User B packs; User A approves      |
| Branch Received   | Branch stock ↑ (pending User A approval) | User B confirms; User A approves   |
| Customer Received | No inventory effect                      | User B confirms delivery           |

### Key Rules

- Gold bar only — ทองแผ่น and รูปพรรณ not included in current scope
- User B manages all physical steps but **never directly mutates inventory**
- User A must approve both the HQ decrement and the Branch increment separately
- In-Transit record carries: origin, destination, transfer ID, dispatch date, expected arrival
- Branch balance does not increase until User A approves receipt confirmation

---

## 8. Supplier Order Domains

### Supplier Buy Order

> User C initiates. Inventory chooses confirmed order to fire increment.

| Field             | Detail                                   |
| ----------------- | ---------------------------------------- |
| Supplier          | Name; brand-locked flag from master data |
| Product type      | ทองแท่ง (gold bar) — current scope       |
| Weight            | Gram / kilogram (supplier unit)          |
| Price             | Agreed price per unit                    |
| Timestamp         | Order placed date/time                   |
| Approving manager | User C                                   |

**Order lifecycle:**

```
Placed → Supplier Delivering → User B Confirmed Arrival → User A Approved Increment → Closed
```

### Supplier Sell Order

> User C initiates. Inventory chooses confirmed order to fire decrement.

| Field             | Detail                                                                   |
| ----------------- | ------------------------------------------------------------------------ |
| Supplier          | Name                                                                     |
| Product type      | ทองแท่ง (gold bar) — current scope                                       |
| Weight            | Gram / kilogram                                                          |
| Price             | Agreed sell price per unit                                               |
| Commission        | ทองแผ่น sell-back incurs higher commission — separate P&L line (FIN-002) |
| Timestamp         | Order placed date/time                                                   |
| Approving manager | User C                                                                   |

**Order lifecycle:**

```
Placed → Gold Dispatched to Supplier → User A Approved Decrement → Closed
```

---

## 9. Gold Product Taxonomy

### Product Types

| Thai    | English           | Supplier Tradeable      | Fee Structure               | Holding Strategy        |
| ------- | ----------------- | ----------------------- | --------------------------- | ----------------------- |
| ทองแท่ง | Gold Bar          | YES — high liquidity    | Spread only                 | Close position same day |
| ทองแผ่น | Sheet / Leaf Gold | YES — higher commission | Spread + ค่าบล็อค           | Hold for margin         |
| รูปพรรณ | Jewellery Gold    | NO                      | Spread + ค่าแรง + ค่ากำเน็จ | Deliberate hold         |

> `supplier_tradeable` must be a **configurable flag** on the product type master record — not hard-coded.

### Bar Sizes — ทองแท่ง **[CONFIRMED]**

All four sizes are active and used for trading.

| Size  | Status |
| ----- | ------ |
| 5 GB  | Active |
| 10 GB | Active |
| 20 GB | Active |
| 50 GB | Active |

> Within the same brand and purity, bar sizes are **fungible for fulfillment**. Brand restriction unaffected.

### Purity Grades

| Purity | Common Name        | Unit of Measure | Typical Products                 |
| ------ | ------------------ | --------------- | -------------------------------- |
| 96.5%  | Standard Thai gold | Gold Baht (GB)  | ทองแท่ง, ทองแผ่น, รูปพรรณ retail |
| 99.99% | Investment grade   | Gram / Kilogram | Investment bars; supplier unit   |

> Two purity grades are **NEVER interchangeable**. Separate inventory pools, separate position calculations, never physically mixed.

### Unit of Measure

| Party    | Unit                                             |
| -------- | ------------------------------------------------ |
| Customer | Gold Baht (GB) — 1 GB = 15.244 g **[CONFIRMED]** |
| Supplier | Gram / Kilogram                                  |
| หลอมทอง  | Gram (physical weight)                           |

> Every transaction record must store weight in **both GB and grams**. Conversion factor `1 GB = 15.244 g` is a **locked master data record** (MDT-004) — never recalculated inline.

### Brand

Brand is a **required field** on every gold unit record.

| Brand        | Notes                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------- |
| ฮั่วเซ็งเฮ็ง | Non-fungible. Cannot substitute with AU, Inter, or any other brand of same purity and size. |
| AU           | Generic                                                                                     |
| Inter        | Generic                                                                                     |
| HQ Smelted   | System-assigned only. Set on smelting output. Not user-selectable.                          |
| Other        | Catch-all                                                                                   |

---

## 10. Cost Basis Principle

> Derived from Session 3. Applies to all workflows.

**Cost basis must flow at actual transaction cost through all workflows.** Market price (MDT-007) is a valuation input for unrealised P&L and display purposes only — it is **never** a cost entry.

| Workflow                       | Cost Basis Rule                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Buy from customer              | Actual transaction price paid to customer. Stored per lot, per transaction.                                   |
| Buy from supplier              | Actual transaction price paid to supplier. Stored as a separate lot.                                          |
| Lot transfer (any direction)   | Cost basis carries forward unchanged. Lot ID links inventory to source.                                       |
| WAC pooling                    | Acceptable within same product type, purity, and brand. WAC from actual costs only — never from market price. |
| Smelting output (manual input) | User A enters actual output volume and cost. Market price is never used.                                      |
| Mixing / blending              | NOT PERMITTED. In-scope gold must never be mixed with out-of-scope products.                                  |

> **Lot ID is the enforcement mechanism [CONFIRMED — INV-003].** Every stock movement carries a Lot ID linking it to its source transaction. Without it, cost basis cannot be traced.

---

## 11. Master Data

| REQ        | Item                           | Values / Rules                                                                                                       |
| ---------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| MDT-001    | Gold product types             | ทองแท่ง / ทองแผ่น / รูปพรรณ, each with fee structure and `supplier_tradeable` flag                                   |
| MDT-002    | Gold bar sizes                 | 5 / 10 / 20 / 50 GB — all active, all tradeable                                                                      |
| MDT-003    | Brands                         | ฮั่วเซ็งเฮ็ง (non-fungible flag) / AU / Inter / HQ Smelted / Other                                                   |
| MDT-004    | GB-to-gram conversion          | 1 GB = 15.244 g — **locked master record**, not editable without controlled change process                           |
| MDT-005    | Branches                       | Branch ID, name, active status. Links to legacy `BranchInfo` via `branch_code`. No distance tier or fixed transfer window — duration depends on factors outside the system. |
| MDT-006    | Suppliers                      | Name, gold types supplied, brand-locked flag, commission rates per product type                                      |
| MDT-007    | Gold market price              | Manual entry only. Records: price value, date/time, entered by. **Valuation input only — never a cost basis input.** |
| MDT-NEW-01 | Purity price conversion factor | Default: 1.036. **[PENDING]** — stable (locked master record) or variable (daily manual entry)?                      |

---

## 12. Open Decisions

| Ref       | Question                                                                                                 | Impact                                                                                     | Priority |
| --------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------- |
| **D-01**  | Will branches record transactions electronically at POS (real-time) or continue paper with batch upload? | Affects completeness of position dashboard current period and branch inventory visibility. | CRITICAL |
| **H-01**  | Is 1.036 the stable factor for `Price(99.99%) = Price(96.5%) × 1.036`, or does it fluctuate?             | Stable → locked master record. Variable → daily manual entry like MDT-007.                 | HIGH     |
| **D-POS** | Should outstanding customer orders appear on the management dashboard or a separate fulfillment screen?  | UI/reporting placement only. POS-007 tracking requirement is MUST regardless.              | MEDIUM   |

---

## 13. Requirement Index

### Position Domain

| ID          | Description                                                                  | Status                              |
| ----------- | ---------------------------------------------------------------------------- | ----------------------------------- |
| POS-001     | Management dashboard — current Fri–Thu period, three net figures             | Confirmed                           |
| POS-006     | Period alert when Net Gold or Net Cash crosses configurable threshold        | Confirmed (SHOULD)                  |
| POS-007     | Paper contracts / customer orders tracked electronically                     | Confirmed (MUST); placement pending |
| POS-PER-001 | Period definition: Fri 00:00 → Thu 23:59, immutable assignment               | Confirmed                           |
| POS-PER-002 | Period net: Net Cash, Net Gold 96.5%, Net Gold 99.99%                        | Confirmed                           |
| POS-PER-003 | Period report: one row per period, filterable, disaggregated by product type | Confirmed                           |
| POS-PER-004 | Dashboard: current period only, resets each Friday                           | Confirmed                           |

### Inventory Domain

| ID         | Description                                                                     | Status             |
| ---------- | ------------------------------------------------------------------------------- | ------------------ |
| INV-001    | Seven-dimension stock tracking; all screens filterable by any combination       | Confirmed          |
| INV-002    | Available / Reserved / In-Transit always displayed separately                   | Confirmed          |
| INV-003    | Every stock movement carries a Lot ID                                           | Confirmed (MUST)   |
| INV-004    | Weight stored in both GB and grams; conversion locked in MDT-004                | Confirmed          |
| INV-005    | Dashboard visually distinguishes ทองแท่ง (minimise) from ทองแผ่น/รูปพรรณ (hold) | Confirmed (SHOULD) |
| INV-006    | Branch stock visible in HQ view at all times                                    | Confirmed          |
| INV-007    | Opening balances enterable at go-live; auditable                                | Confirmed          |
| INV-NEW-01 | Global inventory target (magic number) per purity; variance display             | Confirmed          |

### Transfer Out Domain

| ID      | Description                                                                     | Status    |
| ------- | ------------------------------------------------------------------------------- | --------- |
| TRF-001 | HQ→Branch dispatch: order link, gold bar items, dispatch date, expected arrival | Confirmed |
| TRF-002 | User B manages all delivery status updates                                      | Confirmed |
| TRF-003 | HQ decrement: User A approval required at dispatch                              | Confirmed |
| TRF-004 | Branch increment: User A approval required at receipt confirmation              | Confirmed |
| TRF-005 | Status lifecycle: Created → HQ Dispatched → Branch Received → Customer Received | Confirmed |

### Supplier Orders

| ID           | Description                                                            | Status    |
| ------------ | ---------------------------------------------------------------------- | --------- |
| SUP-BUY-001  | Supplier buy order: fields, User C initiates, lifecycle to increment   | Confirmed |
| SUP-BUY-002  | User B confirms physical arrival; triggers pending mutation for User A | Confirmed |
| SUP-SELL-001 | Supplier sell order: fields, User C initiates, lifecycle to decrement  | Confirmed |
| SUP-SELL-002 | ทองแผ่น sell-back commission recorded as separate P&L line             | Confirmed |

### Trade

| ID      | Description                                                          | Status    |
| ------- | -------------------------------------------------------------------- | --------- |
| TRD-001 | Buy-from-customer: all required fields                               | Confirmed |
| TRD-007 | Cancellation: cashier-error void only, same-day, supervisor approval | Confirmed |
| TRD-010 | Sell-to-customer: fees by product type                               | Confirmed |
| TRD-012 | Large volume customer sales captured in new system                   | Confirmed |

### Scope Boundaries

| ID        | Description                                   | Status                     |
| --------- | --------------------------------------------- | -------------------------- |
| SCOPE-001 | หลอมทอง (Smelting) domain — entire workflow   | Out of scope               |
| SCOPE-002 | Branch→HQ transfer domain                     | Out of scope               |
| SCOPE-003 | Per-transaction P&L (FIFO / average)          | Out of scope; future phase |
| SCOPE-004 | Speculative orders blended with customer flow | Out of scope by design     |

---

_GoldOffice · Business Context Revised · Sessions 1–4 · May 2026 · For development use_
