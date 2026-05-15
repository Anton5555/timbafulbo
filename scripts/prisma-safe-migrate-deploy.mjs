import { spawnSync } from "node:child_process";
import { looksLocalDatabaseUrl, readRemoteMigrationEnv } from "./env.mjs";

const {
  DATABASE_URL: databaseUrl,
  REMOTE_DATABASE_URL: remoteDatabaseUrl,
  ALLOW_REMOTE_MIGRATION,
} = readRemoteMigrationEnv();
const targetUrl = remoteDatabaseUrl ?? databaseUrl ?? "";
const allowRemoteDeploy = ALLOW_REMOTE_MIGRATION === "true";
const looksLocal = targetUrl ? looksLocalDatabaseUrl(targetUrl) : false;

if (!targetUrl) {
  console.error("Remote database URL is missing. Aborting deploy migration.");
  console.error("Set REMOTE_DATABASE_URL (recommended) or DATABASE_URL.");
  process.exit(1);
}

if (looksLocal) {
  console.error("Blocked: prisma migrate deploy should target remote/staging/production only.");
  console.error("Current target URL looks local.");
  process.exit(1);
}

if (!allowRemoteDeploy) {
  console.error("Blocked: remote migration requires explicit confirmation.");
  console.error("Set ALLOW_REMOTE_MIGRATION=true and re-run the command.");
  process.exit(1);
}

const command = "prisma";
const useShell = process.platform === "win32";
const result = spawnSync(command, ["migrate", "deploy"], {
  env: {
    ...process.env,
    DATABASE_URL: targetUrl,
  },
  shell: useShell,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
