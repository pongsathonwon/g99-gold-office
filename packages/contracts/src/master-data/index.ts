import { z } from "zod"
import { BranchIdSchema, SupplierIdSchema, ThaiBahtSchema } from "../shared.js"

export const BranchDistanceTierSchema = z.enum(["NEAR", "MID", "FAR"])

export const BranchSchema = z.object({
  id: BranchIdSchema,
  name: z.string(),
  distanceTier: BranchDistanceTierSchema,
  expectedTransferDays: z.union([z.literal(3), z.literal(5), z.literal(7)]),
  isActive: z.boolean(),
})

export const SupplierSchema = z.object({
  id: SupplierIdSchema,
  name: z.string(),
  isBrandLocked: z.boolean(),
  commissionRates: z.record(z.string(), ThaiBahtSchema),
  isActive: z.boolean(),
})

export const GoldMarketPriceSchema = z.object({
  id: z.string().uuid(),
  pricePerGbThb: ThaiBahtSchema,
  recordedAt: z.string().datetime(),
  recordedBy: z.string().uuid(),
})

export const SetGoldMarketPriceSchema = z.object({
  pricePerGbThb: ThaiBahtSchema,
})

export type Branch = z.infer<typeof BranchSchema>
export type Supplier = z.infer<typeof SupplierSchema>
export type GoldMarketPrice = z.infer<typeof GoldMarketPriceSchema>
export type SetGoldMarketPrice = z.infer<typeof SetGoldMarketPriceSchema>
