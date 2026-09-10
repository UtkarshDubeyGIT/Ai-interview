import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;

export function db() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
  client ??= postgres(databaseUrl, { max: 10, idle_timeout: 20 });
  return client;
}
