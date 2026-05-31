import { Data } from "effect"
import type { LotId, MutationId, UserId } from "@gold/domain"
import type { Role } from "@gold/domain"

export class LotNotFoundError extends Data.TaggedError("LotNotFoundError")<{
  lotId: LotId
}>() {}

export class MutationNotFoundError extends Data.TaggedError("MutationNotFoundError")<{
  mutationId: MutationId
}>() {}

export class InsufficientStockError extends Data.TaggedError("InsufficientStockError")<{
  requested: number
  available: number
}>() {}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<{
  userId: UserId
  requiredRole: Role
}>() {}

export class InvalidTokenError extends Data.TaggedError("InvalidTokenError")<{
  reason: string
}>() {}

export class PersistenceError extends Data.TaggedError("PersistenceError")<{
  cause: unknown
}>() {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  message: string
}>() {}
