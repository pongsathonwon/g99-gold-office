import * as http from "node:http"
import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
import { HttpServer } from "@effect/platform"
import { Effect, Layer } from "effect"
import { appRouter } from "./adapters/http/router.js"
import { AppConfig, AppConfigLive } from "./infrastructure/config.js"
import { DatabaseServicePostgresLive } from "./infrastructure/database.js"

// Composition root — the only place that wires dev vs prod layers.
// Swap DatabaseServicePostgresLive → DatabaseServiceMssqlLive for production.

const ServerLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const config = yield* AppConfig
    return NodeHttpServer.layer(() => http.createServer(), { port: config.port })
  }),
)

const AppLayer = Layer.mergeAll(
  AppConfigLive,
  DatabaseServicePostgresLive.pipe(Layer.provide(AppConfigLive)),
  ServerLive.pipe(Layer.provide(AppConfigLive)),
)

// HttpServer.serve returns a Layer in platform@0.96+
const app = HttpServer.serve(appRouter).pipe(
  Layer.provide(AppLayer),
  Layer.launch,
)

NodeRuntime.runMain(app)
