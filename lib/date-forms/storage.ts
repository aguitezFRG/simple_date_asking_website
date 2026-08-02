import { randomBytes } from "node:crypto";
import { getSupabaseDatabase } from "../supabase/server";
import {
  isPublicFormId,
  validateDateFormConfiguration,
  type DateFormConfiguration,
} from "./schema";
import type { VerifiedCreator } from "../supabase/auth";

export type StoredDateForm = {
  id: string;
  public_id: string;
  configuration: DateFormConfiguration;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
};

export type DateFormLookup =
  | { status: "active"; form: StoredDateForm }
  | { status: "expired" }
  | { status: "unavailable" };

export type DateFormForSubmission = StoredDateForm & {
  creator_email: string;
};

export function createPublicFormId() {
  return `f_${randomBytes(18).toString("base64url")}`;
}

export async function createDateForm(
  configuration: DateFormConfiguration,
  creator: VerifiedCreator,
) {
  const sql = getSupabaseDatabase();
  const rows = await sql<StoredDateForm[]>`
    insert into public.date_forms (
      public_id,
      configuration,
      creator_user_id,
      creator_email
    )
    values (
      ${createPublicFormId()},
      ${sql.json(configuration)},
      ${creator.userId},
      ${creator.email}
    )
    returning
      id,
      public_id,
      configuration,
      created_at::text as created_at,
      expires_at::text as expires_at,
      is_active
  `;

  const created = rows[0];
  if (!created) throw new Error("Supabase did not return the created date form.");
  return created;
}

export async function getDateFormLookup(publicId: string): Promise<DateFormLookup> {
  if (!isPublicFormId(publicId)) return { status: "unavailable" };
  const sql = getSupabaseDatabase();
  const rows = await sql<(StoredDateForm & { is_expired: boolean })[]>`
    select
      id,
      public_id,
      configuration,
      created_at::text as created_at,
      expires_at::text as expires_at,
      is_active,
      expires_at <= now() as is_expired
    from public.date_forms
    where public_id = ${publicId}
    limit 1
  `;
  const form = rows[0];

  if (!form || !form.is_active) return { status: "unavailable" };
  if (!form.expires_at || form.is_expired) return { status: "expired" };
  const validation = validateDateFormConfiguration(form.configuration);
  if (!validation.ok) throw new Error("Stored date form configuration is invalid.");

  const safeForm: StoredDateForm = {
    id: form.id,
    public_id: form.public_id,
    configuration: validation.value,
    created_at: form.created_at,
    expires_at: form.expires_at,
    is_active: form.is_active,
  };
  return {
    status: "active",
    form: safeForm,
  };
}

export async function getDateForm(publicId: string) {
  const result = await getDateFormLookup(publicId);
  return result.status === "active" ? result.form : null;
}

export async function getDateFormForSubmission(publicId: string) {
  if (!isPublicFormId(publicId)) return null;
  const sql = getSupabaseDatabase();
  const rows = await sql<DateFormForSubmission[]>`
    select
      id,
      public_id,
      configuration,
      created_at::text as created_at,
      expires_at::text as expires_at,
      is_active,
      creator_email
    from public.date_forms
    where public_id = ${publicId}
      and is_active = true
      and expires_at > now()
      and creator_user_id is not null
      and creator_email is not null
    limit 1
  `;
  const form = rows[0];
  if (!form) return null;

  const validation = validateDateFormConfiguration(form.configuration);
  if (!validation.ok) throw new Error("Stored date form configuration is invalid.");
  return { ...form, configuration: validation.value };
}
