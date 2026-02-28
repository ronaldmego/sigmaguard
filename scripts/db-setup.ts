import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root
config({ path: join(__dirname, "..", ".env") });

async function main() {
  // Verify env vars exist (for later Supabase client usage)
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    console.error("Run: cp .env.example .env && fill in your values");
    process.exit(1);
  }

  const migrationsDir = join(__dirname, "..", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`Found ${files.length} migration(s)\n`);

  // Execute all migrations via psql (direct PostgreSQL connection)
  for (const file of files) {
    const sqlPath = join(migrationsDir, file);
    console.log(`Executing: ${file}`);

    try {
      const output = execSync(
        `docker exec -i supabase-db psql -U postgres -d postgres < "${sqlPath}"`,
        { stdio: ["pipe", "pipe", "pipe"] }
      );
      console.log(`  ✓ ${file} applied successfully`);
      const stdout = output.toString();
      if (stdout.trim()) {
        console.log(`    ${stdout.trim().split("\n").join("\n    ")}`);
      }
    } catch (err) {
      const error = err as { stderr?: Buffer; stdout?: Buffer };
      const stderr = error.stderr?.toString() || "";
      const stdout = error.stdout?.toString() || "";
      // Ignore "already exists" errors (idempotent migrations)
      if (stderr.includes("already exists") || stderr.includes("already member")) {
        console.log(`  ✓ ${file} already applied (skipping)`);
        if (stdout.trim()) {
          console.log(`    ${stdout.trim()}`);
        }
      } else {
        console.error(`  ✗ ${file} failed:`);
        if (stderr) console.error(`    stderr: ${stderr}`);
        if (stdout) console.error(`    stdout: ${stdout}`);
        process.exit(1);
      }
    }
  }

  // Update PostgREST schemas to include 'pepa'
  console.log("\nChecking PostgREST schema exposure...");
  try {
    const envPath = "/home/adminmgo/projects/supabase-standalone/.env";
    const envContent = readFileSync(envPath, "utf-8");
    const schemasMatch = envContent.match(/PGRST_DB_SCHEMAS=(.+)/);
    const currentSchemas = schemasMatch?.[1] || "";

    if (!currentSchemas.includes("pepa")) {
      console.log("  Adding 'pepa' to PGRST_DB_SCHEMAS...");
      const newSchemas = `${currentSchemas},pepa`;
      const newEnv = envContent.replace(
        /PGRST_DB_SCHEMAS=.+/,
        `PGRST_DB_SCHEMAS=${newSchemas}`
      );
      writeFileSync(envPath, newEnv);
      console.log("  Restarting PostgREST...");
      execSync("docker restart supabase-rest", { stdio: "pipe" });
      execSync("sleep 3");
      console.log("  ✓ PostgREST restarted with pepa schema");
    } else {
      console.log("  ✓ 'pepa' schema already exposed");
    }
  } catch {
    console.warn("  ⚠ Could not update PostgREST schemas automatically.");
    console.warn("  Add 'pepa' to PGRST_DB_SCHEMAS in supabase-standalone/.env manually.");
  }

  console.log("\n✅ Database setup complete!");
}

main().catch(console.error);
