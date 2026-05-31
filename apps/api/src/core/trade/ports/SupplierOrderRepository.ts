import { Context, Effect } from "effect"
import type { SupplierBuyOrder, SupplierSellOrder, CreateSupplierBuyOrder, CreateSupplierSellOrder } from "@gold/contracts/trade"
import type { PersistenceError } from "../../../infrastructure/errors.js"
import type { DatabaseService } from "../../../infrastructure/database.js"

export interface ISupplierOrderRepository {
  createBuyOrder: (
    order: CreateSupplierBuyOrder,
    createdBy: string,
  ) => Effect.Effect<SupplierBuyOrder, PersistenceError, DatabaseService>

  createSellOrder: (
    order: CreateSupplierSellOrder,
    createdBy: string,
  ) => Effect.Effect<SupplierSellOrder, PersistenceError, DatabaseService>

  findBuyOrderById: (
    id: string,
  ) => Effect.Effect<SupplierBuyOrder, PersistenceError, DatabaseService>

  findSellOrderById: (
    id: string,
  ) => Effect.Effect<SupplierSellOrder, PersistenceError, DatabaseService>
}

export class SupplierOrderRepository extends Context.Tag("SupplierOrderRepository")<
  SupplierOrderRepository,
  ISupplierOrderRepository
>() {}
