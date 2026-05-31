/**
 * POS Sync job — watermark-based polling.
 * Reads from POS MSSQL (SELECT-only), appends to sync_staging, transforms
 * via Pure Logic, and upserts into domain tables (idempotent keyed on POS PK).
 *
 * Accepted sync delay: 10 minutes (R-01 resolved).
 *
 * Run on a schedule (cron / systemd timer / PM2 cron).
 * All transformation logic lives in pure functions — no I/O, fully testable.
 */

import { Effect, Layer } from "effect"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistBuyRow {
  buyNumb: string
  buyDate: Date | null
  buyTime: string | null      // stored as nvarchar — combine with buyDate
  branchCode: string | null
  buyStat: string | null      // '1' = active, '0' = cancelled
  custCode: string | null
}

interface BuyListRow {
  id: number
  buyNumb: string | null
  typeCode: string | null     // '8' = gold bar
  laiCode: string | null      // bar size lookup
  goodWeight: number | null
  barBuyPrice: number | null
  buyPrice: number | null
}

// POS bar size lookup (laiCode → GB)
const LAI_CODE_TO_GB: Record<string, number> = {
  "158":  10,
  "2879": 20,
  "616":  5,
  "9935": 50,
}

// ---------------------------------------------------------------------------
// Pure Logic — deterministic, no I/O
// ---------------------------------------------------------------------------

/** Combines POS split date+time columns into a single Date, treating as Asia/Bangkok. */
export const combinePosDateTime = (buyDate: Date, buyTime: string): Date => {
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(buyTime.trim())
  if (!timeMatch) return buyDate
  const [, h = "0", m = "0", s = "0"] = timeMatch
  const combined = new Date(buyDate)
  combined.setHours(Number(h), Number(m), Number(s), 0)
  return combined
}

/** Returns true if this buy row should be synced (not cancelled, not null). */
export const isBuyRowActive = (row: HistBuyRow): boolean =>
  row.buyStat === "1" && row.buyDate !== null

/** Returns GB size for a BuyList row, or null if not a gold bar or unknown size. */
export const resolveBarSizeGb = (row: BuyListRow): number | null => {
  if (row.typeCode !== "8") return null
  return row.laiCode !== null ? (LAI_CODE_TO_GB[row.laiCode] ?? null) : null
}

// ---------------------------------------------------------------------------
// Orchestration stub — wire up when DB adapters are built
// ---------------------------------------------------------------------------

export const syncFromPOS = Effect.gen(function* () {
  // TODO: yield* WatermarkRepository.getLatest()
  // TODO: yield* PosReadAdapter.fetchSince(watermark)
  // const events = rawRows.map(transformPosRowToTransaction) — Pure Logic
  // TODO: yield* StagingRepository.saveAll(rawRows)
  // TODO: yield* PositionTransactionRepository.upsertAll(events)
  // TODO: yield* WatermarkRepository.save(getMaxWatermark(rawRows))
  yield* Effect.logInfo("POS sync stub — implement adapters to activate")
})

// Run if executed directly
const program = syncFromPOS.pipe(
  Effect.provide(Layer.empty),
)

Effect.runPromise(program).catch(console.error)
