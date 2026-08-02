import { randomBytes } from "node:crypto";
import { getSupabaseDatabase } from "../supabase/server";
import {
  isPublicFormId,
  validateDateFormConfiguration,
  type DateFormConfiguration,
} from "./schema";

export type StoredDateForm = {
  id: string;
  public_id: string;
  configuration: DateFormConfiguration;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
};

export function createPublicFormId() {
  return `f_${randomBytes(18).toString("base64url")}`;
}

export async function createDateForm(configuration: DateFormConfiguration) {
  const sql = getSupabaseDatabase();
  const rows = await sql<StoredDateForm[]>`
    insert into public.date_forms (public_id, configuration)
    values (${createPublicFormId()}, ${sql.json(configuration)})
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

export async function getDateForm(publicId: string) {
  if (!isPublicFormId(publicId)) return null;
  const sql = getSupabaseDatabase();
  const rows = await sql<StoredDateForm[]>`
    select
      id,
      public_id,
      configuration,
      created_at::text as created_at,
      expires_at::text as expires_at,
      is_active
    from public.date_forms
    where public_id = ${publicId}
      and is_active = true
      and (expires_at is null or expires_at > now())
    limit 1
  `;
  const form = rows[0];

  if (!form) return null;
  const validation = validateDateFormConfiguration(form.configuration);
  if (!validation.ok) throw new Error("Stored date form configuration is invalid.");

  return { ...form, configuration: validation.value };
}
