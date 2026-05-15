import { spawnSync } from "node:child_process";
import { looksLocalDatabaseUrl, readLocalMigrationEnv } from "./env.mjs";

const { DATABASE_URL: url } = readLocalMigrationEnv();
const args = process.argv.slice(2).filter((arg) => arg !== "--");
const looksLocal = looksLocalDatabaseUrl(url);

if (!looksLocal) {
  console.error("Blocked: prisma migrate dev is only allowed for local databases.");
  console.error(`Current DATABASE_URL: ${url}`);
  console.error(
    "Use a local URL (localhost/127.0.0.1/db container) or run the deploy script for remote environments."
  );
  process.exit(1);
}

const command = "prisma";
const useShell = process.platform === "win32";
const result = spawnSync(command, ["migrate", "dev", ...args], {
  shell: useShell,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
