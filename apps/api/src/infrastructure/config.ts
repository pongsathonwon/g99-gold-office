import { Context, Effect, Layer } from "effect"

export interface AppConfig {
  port: number
  nodeEnv: "development" | "production" | "test"
  db: {
    host: string
    port: number
    database: string
    user: string
    password: string
  }
  jwt: {
    secret: string
    expiresInSeconds: number
  }
}

export class AppConfig extends Context.Tag("AppConfig")<AppConfig, AppConfig>() {}

export const AppConfigLive = Layer.effect(
  AppConfig,
  Effect.sync(() => ({
    port: Number(process.env["PORT"] ?? 3001),
    nodeEnv: (process.env["NODE_ENV"] ?? "development") as AppConfig["nodeEnv"],
    db: {
      host: process.env["DB_HOST"] ?? "localhost",
      port: Number(process.env["DB_PORT"] ?? 5432),
      database: process.env["DB_NAME"] ?? "goldoffice",
      user: process.env["DB_USER"] ?? "goldoffice",
      password: process.env["DB_PASSWORD"] ?? "goldoffice",
    },
    jwt: {
      secret: process.env["JWT_SECRET"] ?? "dev-secret-change-in-prod",
      expiresInSeconds: Number(process.env["JWT_EXPIRES_IN"] ?? 28800),
    },
  })),
)
