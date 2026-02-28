import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });

async function main() {
  console.log("⚠️  Resetting PEPA database...\n");

  // Drop and recreate the schema
  console.log("Dropping pepa schema...");
  try {
    execSync(
      `docker exec supabase-db psql -U postgres -d postgres -c "DROP SCHEMA IF EXISTS pepa CASCADE;"`,
      { stdio: "pipe" }
    );
    console.log("  ✓ Schema dropped\n");
  } catch (err) {
    const error = err as { stderr?: Buffer };
    console.error("  ✗ Failed:", error.stderr?.toString());
    process.exit(1);
  }

  // Re-run migrations
  console.log("Re-running migrations...");
  execSync("npx tsx scripts/db-setup.ts", {
    stdio: "inherit",
    cwd: join(__dirname, ".."),
  });

  // Re-seed
  console.log("\nRe-seeding data...");
  execSync("npx tsx scripts/seed.ts", {
    stdio: "inherit",
    cwd: join(__dirname, ".."),
  });
}

main().catch(console.error);
