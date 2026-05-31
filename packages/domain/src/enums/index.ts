export type Role = "USER_A" | "USER_B" | "USER_C" | "MANAGER"

export type ProductType = "GOLD_BAR" | "SHEET_GOLD" | "JEWELLERY"

export type Purity = "96.5" | "99.99"

export type Brand =
  | "HUA_SENG_HENG"   // ฮั่วเซ็งเฮ็ง — non-fungible
  | "AU"
  | "INTER"
  | "HQ_SMELTED"      // system-assigned only, never user-selectable
  | "OTHER"

export type BarSize = 5 | 10 | 20 | 50 // in Gold Baht

export type StockState = "AVAILABLE" | "RESERVED" | "IN_TRANSIT" | "PENDING_TRANSFORMATION"

export type TransferStatus =
  | "ORDER_CREATED"
  | "HQ_DISPATCHED"
  | "BRANCH_RECEIVED"
  | "CUSTOMER_RECEIVED"

export type SupplierBuyOrderStatus =
  | "PLACED"
  | "SUPPLIER_DELIVERING"
  | "USER_B_CONFIRMED"
  | "USER_A_APPROVED"
  | "CLOSED"

export type SupplierSellOrderStatus =
  | "PLACED"
  | "GOLD_DISPATCHED"
  | "USER_A_APPROVED"
  | "CLOSED"

export type MutationDirection = "INCREMENT" | "DECREMENT"

export type MutationStatus = "PENDING" | "APPROVED" | "REJECTED"
