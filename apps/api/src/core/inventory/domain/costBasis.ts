import { GB_TO_GRAM } from "@gold/domain"
import { GoldBaht, Grams, ThaiBasht } from "@gold/domain"
import type { InventoryLot } from "@gold/contracts/inventory"

export interface CostBasis {
  costPerGbThb: ReturnType<typeof ThaiBasht.make>
  totalCostThb: ReturnType<typeof ThaiBasht.make>
}

export const calculateWeightedAverageCost = (lots: readonly InventoryLot[]): CostBasis => {
  const totalWeight = lots.reduce((sum, l) => sum + l.weightGb, 0)
  const totalCost = lots.reduce((sum, l) => sum + l.totalCostThb, 0)
  if (totalWeight === 0) {
    return {
      costPerGbThb: ThaiBasht.make(0),
      totalCostThb: ThaiBasht.make(0),
    }
  }
  return {
    costPerGbThb: ThaiBasht.make(totalCost / totalWeight),
    totalCostThb: ThaiBasht.make(totalCost),
  }
}

export const gbToGrams = (gb: ReturnType<typeof GoldBaht.make>): ReturnType<typeof Grams.make> =>
  Grams.make(GoldBaht.value(gb) * GB_TO_GRAM)

export const gramsToGb = (grams: ReturnType<typeof Grams.make>): ReturnType<typeof GoldBaht.make> =>
  GoldBaht.make(Grams.value(grams) / GB_TO_GRAM)
