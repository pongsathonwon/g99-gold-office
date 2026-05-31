import { z } from "zod"

// Reusable scalar schemas that mirror @gold/domain branded types
export const GoldBahtSchema = z.number().positive()
export const GramsSchema = z.number().positive()
export const ThaiBahtSchema = z.number()

export const LotIdSchema = z.string().uuid()
export const MutationIdSchema = z.string().uuid()
export const UserIdSchema = z.string().uuid()
export const BranchIdSchema = z.string().uuid()
export const SupplierIdSchema = z.string().uuid()
export const PeriodIdSchema = z.string()

export const PuritySchema = z.enum(["96.5", "99.99"])
export const ProductTypeSchema = z.enum(["GOLD_BAR", "SHEET_GOLD", "JEWELLERY"])
export const BrandSchema = z.enum(["HUA_SENG_HENG", "AU", "INTER", "HQ_SMELTED", "OTHER"])
export const BarSizeSchema = z.union([z.literal(5), z.literal(10), z.literal(20), z.literal(50)])
export const StockStateSchema = z.enum(["AVAILABLE", "RESERVED", "IN_TRANSIT", "PENDING_TRANSFORMATION"])
export const RoleSchema = z.enum(["USER_A", "USER_B", "USER_C", "MANAGER"])
