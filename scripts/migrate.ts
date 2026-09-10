import { readdir, readFile } from "node:fs/promises";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const sql = postgres(databaseUrl, { max: 1 });

await sql`CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
)`;

const migrationsDirectory = new URL("../migrations/", import.meta.url);
const migrationNames = (await readdir(migrationsDirectory))
  .filter((name) => name.endsWith(".sql"))
  .sort();

for (const name of migrationNames) {
  const [alreadyApplied] =
    await sql`SELECT 1 FROM schema_migrations WHERE name=${name}`;
  if (alreadyApplied) continue;

  const migration = await readFile(new URL(name, migrationsDirectory), "utf8");
  await sql.begin(async (transaction) => {
    await transaction.unsafe(migration);
    await transaction`INSERT INTO schema_migrations(name) VALUES(${name})`;
  });
  console.log(`Applied migrations/${name}`);
}

await sql.end();
