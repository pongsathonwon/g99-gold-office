-- V001: Initial schema
-- Least-common-denominator SQL: compatible with Postgres (dev) and MSSQL (prod).
-- Rules: no SERIAL (use IDENTITY), no BOOLEAN (use BIT/SMALLINT), no NOW() (use CURRENT_TIMESTAMP),
--        no RETURNING (use OUTPUT in MSSQL adapter).

-- Users & Auth
CREATE TABLE users (
    id            CHAR(36)     NOT NULL,
    empl_code     VARCHAR(10)  NULL,       -- ref EmplInfo.emplCode; NULL until linked
    username      VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL,   -- USER_A | USER_B | USER_C | MANAGER
    branch_id     CHAR(36),
    is_active     SMALLINT     NOT NULL DEFAULT 1,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_users PRIMARY KEY (id),
    CONSTRAINT uq_users_username UNIQUE (username),
    CONSTRAINT uq_users_empl_code UNIQUE (empl_code),
    CONSTRAINT ck_users_role CHECK (role IN ('USER_A', 'USER_B', 'USER_C', 'MANAGER'))
);

-- Master Data: Branches
-- distance_tier / transfer_days omitted: transfer duration depends on too many factors to model statically.
CREATE TABLE branches (
    id          CHAR(36)    NOT NULL,
    branch_code VARCHAR(4)  NULL,       -- ref BranchInfo.branchCode; NULL for GoldOffice-only branches
    name        VARCHAR(200) NOT NULL,
    is_active   SMALLINT    NOT NULL DEFAULT 1,
    CONSTRAINT pk_branches PRIMARY KEY (id),
    CONSTRAINT uq_branches_branch_code UNIQUE (branch_code)
);

-- Master Data: Suppliers
CREATE TABLE suppliers (
    id              CHAR(36)     NOT NULL,
    name            VARCHAR(200) NOT NULL,
    is_brand_locked SMALLINT     NOT NULL DEFAULT 0,
    is_active       SMALLINT     NOT NULL DEFAULT 1,
    CONSTRAINT pk_suppliers PRIMARY KEY (id)
);

-- Master Data: Gold market price (manual entry, valuation only — never cost basis)
CREATE TABLE gold_market_prices (
    id             CHAR(36)       NOT NULL,
    price_per_gb   DECIMAL(12, 2) NOT NULL,
    recorded_at    TIMESTAMP      NOT NULL,
    recorded_by    CHAR(36)       NOT NULL,
    CONSTRAINT pk_gold_market_prices PRIMARY KEY (id)
);

-- Periods (Fri 00:00 → Thu 23:59 Asia/Bangkok)
CREATE TABLE periods (
    id           CHAR(10)  NOT NULL,  -- YYYY-MM-DD of Friday start
    period_start TIMESTAMP NOT NULL,
    period_end   TIMESTAMP NOT NULL,
    CONSTRAINT pk_periods PRIMARY KEY (id)
);

-- Inventory lots — current state
CREATE TABLE inventory_lots (
    lot_id           CHAR(36)       NOT NULL,
    product_type     VARCHAR(20)    NOT NULL,  -- GOLD_BAR | SHEET_GOLD | JEWELLERY
    purity           VARCHAR(10)    NOT NULL,  -- 96.5 | 99.99
    brand            VARCHAR(30)    NOT NULL,  -- HUA_SENG_HENG | AU | INTER | HQ_SMELTED | OTHER
    bar_size         SMALLINT,                 -- 5 | 10 | 20 | 50 GB; null for non-bar types
    branch_id        CHAR(36)       NOT NULL,
    stock_state      VARCHAR(30)    NOT NULL,  -- AVAILABLE | RESERVED | IN_TRANSIT | PENDING_TRANSFORMATION
    weight_gb        DECIMAL(12, 4) NOT NULL,
    weight_grams     DECIMAL(14, 4) NOT NULL,
    cost_per_gb_thb  DECIMAL(12, 2) NOT NULL,
    total_cost_thb   DECIMAL(14, 2) NOT NULL,
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_inventory_lots PRIMARY KEY (lot_id),
    CONSTRAINT fk_inventory_lots_branch FOREIGN KEY (branch_id) REFERENCES branches(id),
    CONSTRAINT ck_inv_product_type CHECK (product_type IN ('GOLD_BAR', 'SHEET_GOLD', 'JEWELLERY')),
    CONSTRAINT ck_inv_purity CHECK (purity IN ('96.5', '99.99')),
    CONSTRAINT ck_inv_stock_state CHECK (stock_state IN ('AVAILABLE', 'RESERVED', 'IN_TRANSIT', 'PENDING_TRANSFORMATION'))
);

-- Inventory mutations — INSERT-ONLY append log. Never UPDATE or DELETE.
-- Current balances are derived as a VIEW over this table.
CREATE TABLE inventory_mutations (
    mutation_id      CHAR(36)       NOT NULL,
    lot_id           CHAR(36)       NOT NULL,
    direction        VARCHAR(10)    NOT NULL,  -- INCREMENT | DECREMENT
    weight_gb        DECIMAL(12, 4) NOT NULL,
    weight_grams     DECIMAL(14, 4) NOT NULL,
    cost_per_gb_thb  DECIMAL(12, 2) NOT NULL,
    source_context   VARCHAR(500)   NOT NULL,  -- human-readable origin description
    status           VARCHAR(10)    NOT NULL DEFAULT 'PENDING',  -- PENDING | APPROVED | REJECTED
    requested_by     CHAR(36)       NOT NULL,
    requested_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_by      CHAR(36),
    reviewed_at      TIMESTAMP,
    reject_reason    VARCHAR(500),
    CONSTRAINT pk_inventory_mutations PRIMARY KEY (mutation_id),
    CONSTRAINT fk_mutations_lot FOREIGN KEY (lot_id) REFERENCES inventory_lots(lot_id),
    CONSTRAINT ck_mutations_direction CHECK (direction IN ('INCREMENT', 'DECREMENT')),
    CONSTRAINT ck_mutations_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- Inventory targets (magic number) — per purity
CREATE TABLE inventory_targets (
    id             CHAR(36)       NOT NULL,
    purity         VARCHAR(10)    NOT NULL,
    target_gb      DECIMAL(12, 4),
    target_grams   DECIMAL(14, 4),
    changed_by     CHAR(36)       NOT NULL,
    changed_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    previous_gb    DECIMAL(12, 4),
    previous_grams DECIMAL(14, 4),
    CONSTRAINT pk_inventory_targets PRIMARY KEY (id),
    CONSTRAINT ck_targets_purity CHECK (purity IN ('96.5', '99.99'))
);

-- Supplier buy orders
CREATE TABLE supplier_buy_orders (
    id                CHAR(36)       NOT NULL,
    supplier_id       CHAR(36)       NOT NULL,
    product_type      VARCHAR(20)    NOT NULL,
    purity            VARCHAR(10)    NOT NULL,
    brand             VARCHAR(30)    NOT NULL,
    bar_size          SMALLINT,
    weight_grams      DECIMAL(14, 4) NOT NULL,
    price_per_gram    DECIMAL(12, 4) NOT NULL,
    total_cost_thb    DECIMAL(14, 2) NOT NULL,
    status            VARCHAR(30)    NOT NULL DEFAULT 'PLACED',
    created_by        CHAR(36)       NOT NULL,
    created_at        TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    linked_lot_id     CHAR(36),
    CONSTRAINT pk_supplier_buy_orders PRIMARY KEY (id),
    CONSTRAINT fk_sbo_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    CONSTRAINT ck_sbo_status CHECK (status IN ('PLACED', 'SUPPLIER_DELIVERING', 'USER_B_CONFIRMED', 'USER_A_APPROVED', 'CLOSED'))
);

-- Supplier sell orders
CREATE TABLE supplier_sell_orders (
    id             CHAR(36)       NOT NULL,
    supplier_id    CHAR(36)       NOT NULL,
    product_type   VARCHAR(20)    NOT NULL,
    purity         VARCHAR(10)    NOT NULL,
    brand          VARCHAR(30)    NOT NULL,
    bar_size       SMALLINT,
    weight_gb      DECIMAL(12, 4) NOT NULL,
    weight_grams   DECIMAL(14, 4) NOT NULL,
    price_per_gram DECIMAL(12, 4) NOT NULL,
    commission_thb DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status         VARCHAR(30)    NOT NULL DEFAULT 'PLACED',
    created_by     CHAR(36)       NOT NULL,
    created_at     TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    linked_lot_id  CHAR(36),
    CONSTRAINT pk_supplier_sell_orders PRIMARY KEY (id),
    CONSTRAINT fk_sso_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    CONSTRAINT ck_sso_status CHECK (status IN ('PLACED', 'GOLD_DISPATCHED', 'USER_A_APPROVED', 'CLOSED'))
);

-- HQ → Branch transfers (gold bar only in current scope)
CREATE TABLE transfers (
    id                    CHAR(36)       NOT NULL,
    customer_order_ref    VARCHAR(100)   NOT NULL,
    destination_branch_id CHAR(36)       NOT NULL,
    bar_size              SMALLINT       NOT NULL,
    weight_gb             DECIMAL(12, 4) NOT NULL,
    lot_id                CHAR(36)       NOT NULL,
    status                VARCHAR(30)    NOT NULL DEFAULT 'ORDER_CREATED',
    expected_arrival_date TIMESTAMP      NOT NULL,
    dispatched_by         CHAR(36),
    dispatched_at         TIMESTAMP,
    branch_received_at    TIMESTAMP,
    customer_received_at  TIMESTAMP,
    created_at            TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_transfers PRIMARY KEY (id),
    CONSTRAINT fk_transfers_branch FOREIGN KEY (destination_branch_id) REFERENCES branches(id),
    CONSTRAINT fk_transfers_lot FOREIGN KEY (lot_id) REFERENCES inventory_lots(lot_id),
    CONSTRAINT ck_transfers_status CHECK (status IN ('ORDER_CREATED', 'HQ_DISPATCHED', 'BRANCH_RECEIVED', 'CUSTOMER_RECEIVED'))
);

-- POS sync staging — append-only raw POS rows; never deleted; marked processed after use
CREATE TABLE sync_staging (
    id              BIGINT        NOT NULL,  -- POS source PK (watermark key)
    source_table    VARCHAR(50)   NOT NULL,  -- HistBuy | BuyList
    raw_payload     VARCHAR(MAX),
    processed       SMALLINT      NOT NULL DEFAULT 0,
    processed_at    TIMESTAMP,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_sync_staging PRIMARY KEY (id, source_table)
);
