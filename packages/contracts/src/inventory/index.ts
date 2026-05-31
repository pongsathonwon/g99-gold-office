import { z } from "zod"
import {
  BrandSchema, BarSizeSchema, BranchIdSchema, GoldBahtSchema,
  GramsSchema, LotIdSchema, MutationIdSchema, ProductTypeSchema,
  PuritySchema, StockStateSchema, ThaiBahtSchema, UserIdSchema,
} from "../shared.js"

export const InventoryFilterSchema = z.object({
  productType: ProductTypeSchema.optional(),
  purity: PuritySchema.optional(),
  brand: BrandSchema.optional(),
  barSize: BarSizeSchema.optional(),
  branchId: BranchIdSchema.optional(),
  stockState: StockStateSchema.optional(),
  lotId: LotIdSchema.optional(),
})

export const InventoryLotSchema = z.object({
  lotId: LotIdSchema,
  productType: ProductTypeSchema,
  purity: PuritySchema,
  brand: BrandSchema,
  barSize: BarSizeSchema.optional(),
  branchId: BranchIdSchema,
  stockState: StockStateSchema,
  weightGb: GoldBahtSchema,
  weightGrams: GramsSchema,
  costPerGbThb: ThaiBahtSchema,
  totalCostThb: ThaiBahtSchema,
  createdAt: z.string().datetime(),
})

export const PendingMutationSchema = z.object({
  mutationId: MutationIdSchema,
  lotId: LotIdSchema,
  direction: z.enum(["INCREMENT", "DECREMENT"]),
  weightGb: GoldBahtSchema,
  weightGrams: GramsSchema,
  costPerGbThb: ThaiBahtSchema,
  sourceContext: z.string(),
  requestedBy: UserIdSchema,
  requestedAt: z.string().datetime(),
})

export const ApproveMutationSchema = z.object({
  mutationId: MutationIdSchema,
})

export const InventoryTargetSchema = z.object({
  purity: PuritySchema,
  targetGb: GoldBahtSchema.optional(),
  targetGrams: GramsSchema.optional(),
})

export type InventoryFilter = z.infer<typeof InventoryFilterSchema>
export type InventoryLot = z.infer<typeof InventoryLotSchema>
export type PendingMutation = z.infer<typeof PendingMutationSchema>
export type ApproveMutation = z.infer<typeof ApproveMutationSchema>
export type InventoryTarget = z.infer<typeof InventoryTargetSchema>
