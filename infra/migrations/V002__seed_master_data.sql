-- V002: Seed essential master data

-- Branches (placeholder IDs — replace with real UUIDs before go-live)
INSERT INTO branches (id, name, distance_tier, transfer_days, is_active) VALUES
    ('00000000-0000-0000-0000-000000000001', 'สาขา HQ', 'NEAR', 3, 1),
    ('00000000-0000-0000-0000-000000000002', 'สาขาใกล้', 'NEAR', 3, 1),
    ('00000000-0000-0000-0000-000000000003', 'สาขากลาง', 'MID',  5, 1),
    ('00000000-0000-0000-0000-000000000004', 'สาขาไกล',  'FAR',  7, 1);

-- Suppliers
INSERT INTO suppliers (id, name, is_brand_locked, is_active) VALUES
    ('00000000-0000-0000-0001-000000000001', 'ฮั่วเซ็งเฮ็ง', 1, 1),
    ('00000000-0000-0000-0001-000000000002', 'AU Gold',      0, 1),
    ('00000000-0000-0000-0001-000000000003', 'Inter Gold',   0, 1);

-- Initial gold market price (placeholder — updated manually by manager)
INSERT INTO gold_market_prices (id, price_per_gb, recorded_at, recorded_by) VALUES
    ('00000000-0000-0000-0002-000000000001', 0, CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000000');
