import { Context, Effect } from "effect"
import type { LotId } from "@gold/domain"
import type { InventoryFilter, InventoryLot } from "@gold/contracts/inventory"
import type { LotNotFoundError, PersistenceError } from "../../../infrastructure/errors.js"
import type { DatabaseService } from "../../../infrastructure/database.js"

export interface IInventoryRepository {
  findByLotId: (
    id: LotId,
  ) => Effect.Effect<InventoryLot, LotNotFoundError | PersistenceError, DatabaseService>

  findByFilter: (
    filter: InventoryFilter,
  ) => Effect.Effect<InventoryLot[], PersistenceError, DatabaseService>

  save: (
    lot: InventoryLot,
  ) => Effect.Effect<void, PersistenceError, DatabaseService>
}

export class InventoryRepository extends Context.Tag("InventoryRepository")<
  InventoryRepository,
  IInventoryRepository
>() {}
