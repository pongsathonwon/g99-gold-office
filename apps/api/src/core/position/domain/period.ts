import { PERIOD_BOUNDARY_DAY, PERIOD_TIMEZONE, PeriodId } from "@gold/domain"

// Returns the Friday 00:00 Asia/Bangkok that starts the period containing `date`
export const getPeriodStart = (date: Date): Date => {
  const inBangkok = new Date(
    date.toLocaleString("en-US", { timeZone: PERIOD_TIMEZONE }),
  )
  const dayOfWeek = inBangkok.getDay()
  const daysBack = (dayOfWeek - PERIOD_BOUNDARY_DAY + 7) % 7
  const friday = new Date(inBangkok)
  friday.setDate(inBangkok.getDate() - daysBack)
  friday.setHours(0, 0, 0, 0)
  return friday
}

// Deterministic period ID from its Friday start — used as the stable key in DB
export const assignToPeriod = (transactionAt: Date): PeriodId => {
  const start = getPeriodStart(transactionAt)
  const yyyy = start.getFullYear()
  const mm = String(start.getMonth() + 1).padStart(2, "0")
  const dd = String(start.getDate()).padStart(2, "0")
  return PeriodId.make(`${yyyy}-${mm}-${dd}`)
}
