import { z } from "zod"
import { BarSizeSchema, BranchIdSchema, GoldBahtSchema, LotIdSchema, UserIdSchema } from "../shared.js"

export const TransferStatusSchema = z.enum([
  "ORDER_CREATED", "HQ_DISPATCHED", "BRANCH_RECEIVED", "CUSTOMER_RECEIVED",
])

export const CreateTransferSchema = z.object({
  customerOrderRef: z.string(),
  destinationBranchId: BranchIdSchema,
  barSize: BarSizeSchema,
  weightGb: GoldBahtSchema,
  lotId: LotIdSchema,
  expectedArrivalDate: z.string().date(),
})

export const TransferSchema = CreateTransferSchema.extend({
  id: z.string().uuid(),
  status: TransferStatusSchema,
  dispatchedBy: UserIdSchema.optional(),
  dispatchedAt: z.string().datetime().optional(),
  branchReceivedAt: z.string().datetime().optional(),
  customerReceivedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
})

export type CreateTransfer = z.infer<typeof CreateTransferSchema>
export type Transfer = z.infer<typeof TransferSchema>
