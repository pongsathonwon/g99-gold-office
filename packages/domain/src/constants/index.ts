// Locked master record MDT-004 — never recalculate inline
export const GB_TO_GRAM = 15.244 as const

// Business rule: period boundary is Friday 00:00 Asia/Bangkok
export const PERIOD_BOUNDARY_DAY = 5 as const // 0=Sun, 5=Fri
export const PERIOD_TIMEZONE = "Asia/Bangkok" as const

// MDT-NEW-01 — PENDING confirmation (H-01); stable locked record for now
export const PURITY_PRICE_CONVERSION_FACTOR = 1.036 as const
