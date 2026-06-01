-- Existing production MSSQL master data (reference only — GoldOffice never writes to these tables).
-- No formal PK constraints in prod; NOT NULL columns act as natural keys (is_identity = 0).
-- GoldOffice links to these via empl_code / branch_code columns on its own tables.

CREATE TABLE EmplInfo (
    emplCode        VARCHAR(10)     NOT NULL,   -- natural PK, THAI_CI_AI
    emplName        VARCHAR(100)    NULL,       -- THAI_CI_AI
    userName        VARCHAR(40)     NULL,       -- THAI_CI_AI
    userPWD         VARCHAR(20)     NULL,       -- plain text, THAI_CI_AI
    branchCode      VARCHAR(4)      NULL,       -- ref BranchInfo.branchCode, THAI_CI_AI
    emplStat        CHAR(1)         NULL        -- '1' = active, '0' = inactive
);

CREATE TABLE BranchInfo (
    branchCode      VARCHAR(4)      NOT NULL,   -- natural PK, THAI_CI_AI
    branchName      VARCHAR(100)    NULL,       -- THAI_CI_AI
    branchShortName VARCHAR(40)     NULL,       -- THAI_CI_AI
    branchStat      CHAR(1)         NULL        -- '1' = active, '0' = inactive, THAI_CI_AI
);

-- Production branch rows (sourced from live BranchInfo)
INSERT INTO BranchInfo (branchCode, branchName, branchShortName, branchStat) VALUES
    ('0',  'G000-สำนักงานใหญ่',  'G000-สำนักงานใหญ่',  '1'),
    ('1',  'G006-TLBP บางพลี',   'G006-TLBP บางพลี',   '1'),
    ('10', 'G010-MVPN พัฒนาการ', 'G010-MVPN พัฒนาการ', '1'),
    ('14', 'G014-BCTN ติวานนท์', 'G014-BCTN ติวานนท์', '1');