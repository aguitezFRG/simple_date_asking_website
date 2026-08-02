// @vitest-environment node

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validConfiguration } from "./fixtures";

const database = vi.hoisted(() => ({
  getSupabaseDatabase: vi.fn(),
}));

vi.mock("../lib/supabase/server", () => database);

import {
  createDateForm,
  createPublicFormId,
  getDateForm,
  getDateFormLookup,
  getDateFormForSubmission,
} from "../lib/date-forms/storage";

const verifiedCreator = {
  userId: "b0a7fe8f-f3df-4476-bec5-48bc54746c6c",
  email: "creator@example.com",
};

function storedForm(configuration = validConfiguration()) {
  return {
    id: "8da2fa06-2435-4fcf-8b3c-01025819f17f",
    public_id: "f_abcdefghijklmnopqrstuvwx",
    configuration,
    created_at: "2026-08-03 00:00:00+00",
    expires_at: "2026-08-06 00:00:00+00",
    is_active: true,
  };
}

function sqlReturning(rows: unknown[]) {
  const sql = vi.fn(async () => rows) as unknown as {
    (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>;
    json: ReturnType<typeof vi.fn>;
  };
  sql.json = vi.fn((value) => value);
  database.getSupabaseDatabase.mockReturnValue(sql);
  return sql;
}

beforeEach(() => database.getSupabaseDatabase.mockReset());
afterEach(() => vi.unstubAllGlobals());

describe("opaque public identifiers", () => {
  it("generates non-sequential unique identifiers without exposing database IDs", () => {
    const ids = Array.from({ length: 100 }, () => createPublicFormId());
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^f_[A-Za-z0-9_-]{24}$/));
    expect(ids.every((id) => !/^f_\d+$/.test(id))).toBe(true);
  });
});

describe("direct server-side database storage", () => {
  it("inserts the validated JSON and returns the generated public identifier", async () => {
    const expected = storedForm();
    const sql = sqlReturning([expected]);
    await expect(createDateForm(validConfiguration(), verifiedCreator)).resolves.toEqual(expected);
    expect(sql.json).toHaveBeenCalledWith(validConfiguration());
    expect(sql).toHaveBeenCalledOnce();
  });

  it("does not query storage for malformed identifiers", async () => {
    expect(await getDateForm("not-valid")).toBeNull();
    expect(database.getSupabaseDatabase).not.toHaveBeenCalled();
  });

  it("returns an active, unexpired, server-validated configuration", async () => {
    const expected = storedForm();
    sqlReturning([expected]);
    await expect(getDateForm(expected.public_id)).resolves.toEqual(expected);
  });

  it("returns missing, disabled, and expired records as unavailable", async () => {
    sqlReturning([]);
    await expect(getDateForm("f_abcdefghijklmnopqrstuvwx")).resolves.toBeNull();
  });

  it("distinguishes the exact expired boundary from missing forms", async () => {
    sqlReturning([{ ...storedForm(), is_expired: true }]);
    await expect(getDateFormLookup("f_abcdefghijklmnopqrstuvwx")).resolves.toEqual({
      status: "expired",
    });
  });

  it("retrieves the private creator destination only for submission", async () => {
    const expected = { ...storedForm(), creator_email: verifiedCreator.email };
    sqlReturning([expected]);
    await expect(getDateFormForSubmission(expected.public_id)).resolves.toEqual(expected);
  });

  it("rejects invalid JSON even if storage contains it", async () => {
    sqlReturning([storedForm({ version: 1 } as never)]);
    await expect(getDateForm("f_abcdefghijklmnopqrstuvwx")).rejects.toThrow(
      "Stored date form configuration is invalid",
    );
  });
});

describe("database authorization migration", () => {
  it("keeps direct anon and authenticated table access revoked", () => {
    const migration = readFileSync(
      "supabase/migrations/20260803090000_harden_date_forms_constraints.sql",
      "utf8",
    );
    expect(migration).toContain(
      "revoke all on table public.date_forms from anon, authenticated",
    );
    expect(migration).not.toMatch(/grant\s+(select|insert|update|delete)/i);

    const policyMigration = readFileSync(
      "supabase/migrations/20260803093000_add_explicit_browser_deny_policy.sql",
      "utf8",
    );
    expect(policyMigration).toContain("to anon, authenticated");
    expect(policyMigration).toContain("using (false)");
    expect(policyMigration).toContain("with check (false)");
  });

  it("enforces exact expiry and a private hourly cleanup function", () => {
    const migration = readFileSync(
      "supabase/migrations/20260803110000_verified_creator_form_lifecycle.sql",
      "utf8",
    );
    expect(migration).toContain("expires_at = created_at + interval '3 days'");
    expect(migration).toContain("where expires_at <= transaction_timestamp()");
    expect(migration).toContain("'0 * * * *'");
    expect(migration).toContain("revoke all on function private.cleanup_expired_date_forms()");
    expect(migration).toContain("create index if not exists date_forms_expires_at_idx");
  });
});
