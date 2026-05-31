import { Effect } from "effect"
import type { MutationId, UserId } from "@gold/domain"
import { PendingMutationRepository } from "../ports/PendingMutationRepository.js"
import { InventoryRepository } from "../ports/InventoryRepository.js"
import { UnauthorizedError } from "../../../infrastructure/errors.js"

const validateApproverIsUserA = (
  approvedBy: UserId,
  role: string,
): Effect.Effect<void, UnauthorizedError> =>
  role === "USER_A"
    ? Effect.void
    : Effect.fail(new UnauthorizedError({ userId: approvedBy, requiredRole: "USER_A" }))

export const approveMutation = (id: MutationId, approvedBy: UserId, role: string) =>
  Effect.gen(function* () {
    yield* validateApproverIsUserA(approvedBy, role)
    const pendingRepo = yield* PendingMutationRepository
    const inventoryRepo = yield* InventoryRepository
    const pending = yield* pendingRepo.findById(id)
    yield* pendingRepo.approve(id, approvedBy)
    // Re-fetch the saved lot and persist the approved state
    const lots = yield* inventoryRepo.findByFilter({ lotId: pending.lotId })
    if (lots.length > 0 && lots[0] !== undefined) {
      yield* inventoryRepo.save({ ...lots[0], stockState: "AVAILABLE" })
    }
  })
