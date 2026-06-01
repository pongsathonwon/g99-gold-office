-- V002: Seed essential master data

-- Branches — mirrored from BranchInfo; branch_code links back to legacy table
INSERT INTO branches (id, branch_code, name, is_active) VALUES
    ('00000000-0000-0000-0000-000000000001', '0',  'G000-สำนักงานใหญ่',  1),
    ('00000000-0000-0000-0000-000000000002', '1',  'G006-TLBP บางพลี',   1),
    ('00000000-0000-0000-0000-000000000003', '10', 'G010-MVPN พัฒนาการ', 1),
    ('00000000-0000-0000-0000-000000000004', '14', 'G014-BCTN ติวานนท์', 1);

-- Suppliers
INSERT INTO suppliers (id, name, is_brand_locked, is_active) VALUES
    ('00000000-0000-0000-0001-000000000001', 'ฮั่วเซ็งเฮ็ง', 1, 1),
    ('00000000-0000-0000-0001-000000000002', 'AU Gold',      0, 1),
    ('00000000-0000-0000-0001-000000000003', 'Inter Gold',   0, 1);

-- Initial gold market price (placeholder — updated manually by manager)
INSERT INTO gold_market_prices (id, price_per_gb, recorded_at, recorded_by) VALUES
    ('00000000-0000-0000-0002-000000000001', 0, CURRENT_TIMESTAMP, '00000000-0000-0000-0000-000000000000');
