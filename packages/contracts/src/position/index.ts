import { z } from "zod"
import { GoldBahtSchema, GramsSchema, PeriodIdSchema, ProductTypeSchema, ThaiBahtSchema } from "../shared.js"

export const PeriodNetSchema = z.object({
  periodId: PeriodIdSchema,
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  netCashThb: ThaiBahtSchema,
  netGold965Gb: GoldBahtSchema,
  netGold9999Grams: GramsSchema,
})

export const PeriodNetByProductSchema = PeriodNetSchema.extend({
  productType: ProductTypeSchema,
})

export const PositionAlertThresholdSchema = z.object({
  netGold965GbThreshold: GoldBahtSchema.optional(),
  netGold9999GramsThreshold: GramsSchema.optional(),
  netCashThbThreshold: ThaiBahtSchema.optional(),
})

export type PeriodNet = z.infer<typeof PeriodNetSchema>
export type PeriodNetByProduct = z.infer<typeof PeriodNetByProductSchema>
export type PositionAlertThreshold = z.infer<typeof PositionAlertThresholdSchema>
