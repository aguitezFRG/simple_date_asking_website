import postgres, { type Sql } from "postgres";

const globalForDateForms = globalThis as typeof globalThis & {
  dateFormDatabase?: Sql;
};

export function getSupabaseConnectionString() {
  const connectionString = process.env.SUPABASE_CONNECTION_STRING;
  if (!connectionString) throw new Error("Supabase database is not configured.");

  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error("Supabase connection string is invalid.");
  }

  const isPostgresProtocol =
    parsed.protocol === "postgres:" || parsed.protocol === "postgresql:";
  const isSupabaseHost =
    parsed.hostname.endsWith(".supabase.com") ||
    parsed.hostname.endsWith(".supabase.co");

  if (!isPostgresProtocol || !isSupabaseHost) {
    throw new Error("Supabase connection string is invalid.");
  }

  return connectionString;
}

export function getSupabaseDatabase() {
  if (!globalForDateForms.dateFormDatabase) {
    globalForDateForms.dateFormDatabase = postgres(getSupabaseConnectionString(), {
      connect_timeout: 10,
      idle_timeout: 20,
      max: 1,
      prepare: false,
      ssl: "require",
    });
  }

  return globalForDateForms.dateFormDatabase;
}
