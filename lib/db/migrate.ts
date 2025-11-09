import "dotenv/config";
import { resolve } from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(process.env.DATABASE_URL, {
  max: 1,
  onnotice: () => { },
});
const db = drizzle(client);

async function runMigrations() {
  console.log("Running migrations...");
  const migrationsFolder = resolve(process.cwd(), "drizzle/migrations");
  await migrate(db, { migrationsFolder });
  console.log("Migrations completed!");
  await client.end();
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  if (err.cause && (err.cause as { code?: string }).code === "42P07") {
    console.error(
      "\nTables already exist in the database. This usually happens when tables were created with 'db:push'.\n" +
      "Options:\n" +
      "1. If the schema matches, manually mark the migration as applied in the __drizzle_migrations table\n" +
      "2. Drop existing tables and re-run migrations (will delete data)\n" +
      "3. Continue using 'db:push' for schema changes instead of migrations"
    );
  }
  process.exit(1);
});


