import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { HttpServer } from "@effect/platform"
import { Effect, Layer } from "effect"
import { appRouter } from "./adapters/http/router.js"
import { AppConfigLive } from "./infrastructure/config.js"
import { DatabaseServicePostgresLive } from "./infrastructure/database.js"
import { AppConfig } from "./infrastructure/config.js"

// Composition root — the only place that wires dev vs prod layers.
// Swap DatabaseServicePostgresLive → DatabaseServiceMssqlLive for production.
const ServerLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const config = yield* AppConfig
    return NodeHttpServer.layer(() => ({ port: config.port }))
  }),
)

const AppLayer = Layer.mergeAll(
  AppConfigLive,
  DatabaseServicePostgresLive.pipe(Layer.provide(AppConfigLive)),
  ServerLive.pipe(Layer.provide(AppConfigLive)),
)

const app = HttpServer.serve(appRouter).pipe(
  Effect.provide(AppLayer),
)

NodeRuntime.runMain(app)
