import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL_UNPOOLED) {
  console.error(
    "Set DATABASE_URL_UNPOOLED (direct connection) before running migrations"
  );
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL_UNPOOLED);

const migrationPath = join(__dirname, "..", "db", "migrations", "001-schema.sql");
const migrationSql = readFileSync(migrationPath, "utf8");

// Split on semicolons; filter blank and comment-only fragments
const statements = migrationSql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => {
    if (!s) return false;
    // Strip comment lines and check if anything remains
    const withoutComments = s
      .split("\n")
      .map((line) => line.replace(/--.*$/, "").trim())
      .join(" ")
      .trim();
    return withoutComments.length > 0;
  });

try {
  for (const statement of statements) {
    await sql.query(statement);
  }
  console.log("Migration applied: 7 tables");
  process.exit(0);
} catch (err) {
  console.error("Migration failed on statement:");
  console.error(err.message);
  process.exit(1);
}
