import { describe, expect, it } from "vitest"
import { calculateWeightedAverageCost, gbToGrams, gramsToGb } from "./costBasis.js"
import { GB_TO_GRAM } from "@gold/domain"
import type { InventoryLot } from "@gold/contracts/inventory"

const makeLot = (weightGb: number, totalCostThb: number): InventoryLot => ({
  lotId: "lot-1",
  productType: "GOLD_BAR",
  purity: "96.5",
  brand: "AU",
  barSize: 10,
  branchId: "branch-1",
  stockState: "AVAILABLE",
  weightGb,
  weightGrams: weightGb * GB_TO_GRAM,
  costPerGbThb: totalCostThb / weightGb,
  totalCostThb,
  createdAt: new Date().toISOString(),
})

describe("calculateWeightedAverageCost", () => {
  it("returns zero basis for empty lots", () => {
    const result = calculateWeightedAverageCost([])
    expect(result.costPerGbThb).toBe(0)
    expect(result.totalCostThb).toBe(0)
  })

  it("computes WAC correctly across multiple lots", () => {
    const lots = [makeLot(10, 300_000), makeLot(5, 140_000)]
    const result = calculateWeightedAverageCost(lots)
    expect(result.totalCostThb).toBe(440_000)
    expect(result.costPerGbThb).toBeCloseTo(440_000 / 15)
  })
})

describe("gbToGrams / gramsToGb", () => {
  it("converts 1 GB to 15.244 grams", () => {
    expect(gbToGrams(1 as ReturnType<typeof import("@gold/domain").GoldBaht.make>)).toBeCloseTo(15.244)
  })
})
