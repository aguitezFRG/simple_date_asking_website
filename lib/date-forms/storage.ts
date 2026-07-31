import { randomBytes } from "node:crypto";
import { supabaseServerRequest } from "../supabase/server";
import type { DateFormConfiguration } from "./schema";

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
  const publicId = createPublicFormId();
  const rows = await supabaseServerRequest<StoredDateForm[]>("date_forms", {
    method: "POST",
    prefer: "return=representation",
    body: {
      public_id: publicId,
      configuration,
    },
  });

  const created = rows[0];
  if (!created) throw new Error("Supabase did not return the created date form.");
  return created;
}

export async function getDateForm(publicId: string) {
  const query = new URLSearchParams({
    public_id: `eq.${publicId}`,
    is_active: "eq.true",
    select: "id,public_id,configuration,created_at,expires_at,is_active",
    limit: "1",
  });
  const rows = await supabaseServerRequest<StoredDateForm[]>("date_forms", { query });
  const form = rows[0];

  if (!form) return null;
  if (form.expires_at && new Date(form.expires_at).getTime() <= Date.now()) return null;
  return form;
}
