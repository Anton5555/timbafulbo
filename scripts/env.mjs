import "dotenv/config";
import { z } from "zod";

const localEnvSchema = z.object({
  DATABASE_URL: z.url(),
});

const remoteEnvSchema = z.object({
  DATABASE_URL: z.url().optional(),
  REMOTE_DATABASE_URL: z.url().optional(),
  ALLOW_REMOTE_MIGRATION: z.enum(["true", "false"]).default("false"),
});

export function readLocalMigrationEnv() {
  const parsed = localEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
  });

  if (!parsed.success) {
    console.error("Invalid local migration environment.");
    console.error("Expected DATABASE_URL to be a valid URL.");
    process.exit(1);
  }

  return parsed.data;
}

export function readRemoteMigrationEnv() {
  const parsed = remoteEnvSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    REMOTE_DATABASE_URL: process.env.REMOTE_DATABASE_URL,
    ALLOW_REMOTE_MIGRATION: process.env.ALLOW_REMOTE_MIGRATION,
  });

  if (!parsed.success) {
    console.error("Invalid remote migration environment.");
    console.error(
      "Expected DATABASE_URL/REMOTE_DATABASE_URL (if set) to be valid URLs and ALLOW_REMOTE_MIGRATION to be true/false.",
    );
    process.exit(1);
  }

  return parsed.data;
}

export function looksLocalDatabaseUrl(url) {
  const lowerUrl = url.toLowerCase();
  return (
    lowerUrl.includes("localhost") ||
    lowerUrl.includes("127.0.0.1") ||
    lowerUrl.includes("[::1]") ||
    lowerUrl.includes("host.docker.internal") ||
    lowerUrl.includes("@db:")
  );
}
