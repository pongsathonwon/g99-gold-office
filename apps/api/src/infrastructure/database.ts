import { Context, Effect, Layer } from "effect"
import { Kysely, PostgresDialect } from "kysely"
import pg from "pg"
import { AppConfig } from "./config.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = Kysely<any>

export class DatabaseService extends Context.Tag("DatabaseService")<
  DatabaseService,
  Database
>() {}

export const DatabaseServicePostgresLive = Layer.effect(
  DatabaseService,
  Effect.gen(function* () {
    const config = yield* AppConfig
    const pool = new pg.Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
    })
    return new Kysely({ dialect: new PostgresDialect({ pool }) })
  }),
)
