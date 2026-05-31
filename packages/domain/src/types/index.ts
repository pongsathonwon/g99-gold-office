// Branded scalar types — prevents mixing unit-incompatible numbers
declare const _brand: unique symbol

type Brand<T, B extends string> = T & { readonly [_brand]: B }

export type GoldBaht = Brand<number, "GoldBaht">
export type Grams = Brand<number, "Grams">
export type ThaiBasht = Brand<number, "ThaiBasht">

export type LotId = Brand<string, "LotId">
export type MutationId = Brand<string, "MutationId">
export type UserId = Brand<string, "UserId">
export type BranchId = Brand<string, "BranchId">
export type SupplierId = Brand<string, "SupplierId">
export type PeriodId = Brand<string, "PeriodId">
export type TransferId = Brand<string, "TransferId">
export type SupplierBuyOrderId = Brand<string, "SupplierBuyOrderId">
export type SupplierSellOrderId = Brand<string, "SupplierSellOrderId">

// Smart constructors — use these instead of raw casts
export const GoldBaht = {
  make: (n: number): GoldBaht => n as GoldBaht,
  value: (gb: GoldBaht): number => gb,
} as const

export const Grams = {
  make: (n: number): Grams => n as Grams,
  value: (g: Grams): number => g,
} as const

export const ThaiBasht = {
  make: (n: number): ThaiBasht => n as ThaiBasht,
  value: (b: ThaiBasht): number => b,
} as const

export const LotId = {
  make: (s: string): LotId => s as LotId,
  value: (id: LotId): string => id,
} as const

export const UserId = {
  make: (s: string): UserId => s as UserId,
  value: (id: UserId): string => id,
} as const

export const BranchId = {
  make: (s: string): BranchId => s as BranchId,
  value: (id: BranchId): string => id,
} as const

export const PeriodId = {
  make: (s: string): PeriodId => s as PeriodId,
  value: (id: PeriodId): string => id,
} as const
