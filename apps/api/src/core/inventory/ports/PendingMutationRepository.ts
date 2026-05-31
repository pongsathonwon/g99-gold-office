import { Context, Effect } from "effect"
import type { MutationId, UserId } from "@gold/domain"
import type { PendingMutation } from "@gold/contracts/inventory"
import type { MutationNotFoundError, PersistenceError, UnauthorizedError } from "../../../infrastructure/errors.js"
import type { DatabaseService } from "../../../infrastructure/database.js"

export interface IPendingMutationRepository {
  findById: (
    id: MutationId,
  ) => Effect.Effect<PendingMutation, MutationNotFoundError | PersistenceError, DatabaseService>

  findAll: () => Effect.Effect<PendingMutation[], PersistenceError, DatabaseService>

  save: (
    mutation: PendingMutation,
  ) => Effect.Effect<void, PersistenceError, DatabaseService>

  approve: (
    id: MutationId,
    approvedBy: UserId,
  ) => Effect.Effect<void, MutationNotFoundError | UnauthorizedError | PersistenceError, DatabaseService>

  reject: (
    id: MutationId,
    rejectedBy: UserId,
    reason: string,
  ) => Effect.Effect<void, MutationNotFoundError | UnauthorizedError | PersistenceError, DatabaseService>
}

export class PendingMutationRepository extends Context.Tag("PendingMutationRepository")<
  PendingMutationRepository,
  IPendingMutationRepository
>() {}
