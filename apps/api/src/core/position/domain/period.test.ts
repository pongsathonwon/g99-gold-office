import { describe, expect, it } from "vitest"
import { assignToPeriod, getPeriodStart } from "./period.js"

describe("getPeriodStart", () => {
  it("Friday itself returns that Friday", () => {
    // 2026-05-29 is a Friday
    const friday = new Date("2026-05-29T08:00:00+07:00")
    const start = getPeriodStart(friday)
    expect(start.getDay()).toBe(5)
  })

  it("Thursday returns the preceding Friday", () => {
    const thursday = new Date("2026-06-04T12:00:00+07:00")
    const start = getPeriodStart(thursday)
    // Should be 2026-05-29
    expect(start.getDate()).toBe(29)
    expect(start.getMonth()).toBe(4) // May = 4
  })
})

describe("assignToPeriod", () => {
  it("two transactions in same period get same PeriodId", () => {
    const mon = new Date("2026-06-01T10:00:00+07:00")
    const wed = new Date("2026-06-03T15:00:00+07:00")
    expect(assignToPeriod(mon)).toBe(assignToPeriod(wed))
  })

  it("Friday resets the period", () => {
    const thu = new Date("2026-06-04T23:59:00+07:00")
    const fri = new Date("2026-06-05T00:01:00+07:00")
    expect(assignToPeriod(thu)).not.toBe(assignToPeriod(fri))
  })
})
