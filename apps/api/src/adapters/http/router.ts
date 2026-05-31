import { HttpRouter, HttpServerResponse } from "@effect/platform"

// Route stubs — implement handlers per domain as use-cases are built
export const appRouter = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/health",
    HttpServerResponse.json({ status: "ok" }),
  ),
)
