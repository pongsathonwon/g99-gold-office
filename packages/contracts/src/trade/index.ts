import { z } from "zod"
import {
  BarSizeSchema, BrandSchema, GoldBahtSchema, GramsSchema,
  LotIdSchema, ProductTypeSchema, PuritySchema, SupplierIdSchema,
  ThaiBahtSchema, UserIdSchema,
} from "../shared.js"

export const SupplierBuyOrderStatusSchema = z.enum([
  "PLACED", "SUPPLIER_DELIVERING", "USER_B_CONFIRMED", "USER_A_APPROVED", "CLOSED",
])

export const SupplierSellOrderStatusSchema = z.enum([
  "PLACED", "GOLD_DISPATCHED", "USER_A_APPROVED", "CLOSED",
])

export const CreateSupplierBuyOrderSchema = z.object({
  supplierId: SupplierIdSchema,
  productType: ProductTypeSchema,
  purity: PuritySchema,
  brand: BrandSchema,
  barSize: BarSizeSchema.optional(),
  weightGrams: GramsSchema,
  pricePerGramThb: ThaiBahtSchema,
})

export const SupplierBuyOrderSchema = CreateSupplierBuyOrderSchema.extend({
  id: z.string().uuid(),
  status: SupplierBuyOrderStatusSchema,
  totalCostThb: ThaiBahtSchema,
  createdBy: UserIdSchema,
  createdAt: z.string().datetime(),
  linkedLotId: LotIdSchema.optional(),
})

export const CreateSupplierSellOrderSchema = z.object({
  supplierId: SupplierIdSchema,
  productType: ProductTypeSchema,
  purity: PuritySchema,
  brand: BrandSchema,
  barSize: BarSizeSchema.optional(),
  weightGb: GoldBahtSchema,
  weightGrams: GramsSchema,
  pricePerGramThb: ThaiBahtSchema,
  commissionThb: ThaiBahtSchema,
})

export const SupplierSellOrderSchema = CreateSupplierSellOrderSchema.extend({
  id: z.string().uuid(),
  status: SupplierSellOrderStatusSchema,
  createdBy: UserIdSchema,
  createdAt: z.string().datetime(),
  linkedLotId: LotIdSchema.optional(),
})

export type CreateSupplierBuyOrder = z.infer<typeof CreateSupplierBuyOrderSchema>
export type SupplierBuyOrder = z.infer<typeof SupplierBuyOrderSchema>
export type CreateSupplierSellOrder = z.infer<typeof CreateSupplierSellOrderSchema>
export type SupplierSellOrder = z.infer<typeof SupplierSellOrderSchema>
