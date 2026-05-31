import { Context, Effect } from "effect"
import type { CreateTransfer, Transfer } from "@gold/contracts/transfer"
import type { PersistenceError } from "../../../infrastructure/errors.js"
import type { DatabaseService } from "../../../infrastructure/database.js"

export interface ITransferRepository {
  create: (
    transfer: CreateTransfer,
  ) => Effect.Effect<Transfer, PersistenceError, DatabaseService>

  findById: (
    id: string,
  ) => Effect.Effect<Transfer, PersistenceError, DatabaseService>

  updateStatus: (
    id: string,
    status: Transfer["status"],
    updatedBy: string,
  ) => Effect.Effect<Transfer, PersistenceError, DatabaseService>
}

export class TransferRepository extends Context.Tag("TransferRepository")<
  TransferRepository,
  ITransferRepository
>() {}
