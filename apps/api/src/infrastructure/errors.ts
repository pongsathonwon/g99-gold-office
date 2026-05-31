import { Data } from "effect"
import type { LotId, MutationId, UserId, Role } from "@gold/domain"

export class LotNotFoundError extends Data.TaggedError("LotNotFoundError")<{
  readonly lotId: LotId
}> {}

export class MutationNotFoundError extends Data.TaggedError("MutationNotFoundError")<{
  readonly mutationId: MutationId
}> {}

export class InsufficientStockError extends Data.TaggedError("InsufficientStockError")<{
  readonly requested: number
  readonly available: number
}> {}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  readonly userId: UserId
  readonly requiredRole: Role
}> {}

export class InvalidTokenError extends Data.TaggedError("InvalidTokenError")<{
  readonly reason: string
}> {}

export class PersistenceError extends Data.TaggedError("PersistenceError")<{
  readonly cause: unknown
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string
}> {}
