// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseConnectionString } from "../lib/supabase/server";

afterEach(() => vi.unstubAllEnvs());

describe("Supabase connection configuration", () => {
  it("accepts only a server-side Supabase Postgres connection string", () => {
    const connection =
      "postgresql://postgres.project:password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
    vi.stubEnv("SUPABASE_CONNECTION_STRING", connection);
    expect(getSupabaseConnectionString()).toBe(connection);
  });

  it("rejects missing, malformed, or unrelated database URLs", () => {
    vi.stubEnv("SUPABASE_CONNECTION_STRING", "");
    expect(() => getSupabaseConnectionString()).toThrow("not configured");

    vi.stubEnv("SUPABASE_CONNECTION_STRING", "not-a-url");
    expect(() => getSupabaseConnectionString()).toThrow("invalid");

    vi.stubEnv("SUPABASE_CONNECTION_STRING", "postgresql://user:pass@example.com/db");
    expect(() => getSupabaseConnectionString()).toThrow("invalid");
  });
});
