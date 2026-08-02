import { createDateForm } from "../../../lib/date-forms/storage";
import { validateDateFormConfiguration } from "../../../lib/date-forms/schema";
import { getCreatorAuthState } from "../../../lib/supabase/auth";

export const runtime = "nodejs";

const MAX_CONFIGURATION_BYTES = 32_000;

export async function POST(request: Request) {
  const authState = await getCreatorAuthState();
  if (authState.status === "unavailable") {
    return Response.json({ error: "Email verification is not configured." }, { status: 503 });
  }
  if (authState.status === "signed_out") {
    return Response.json({ error: "Sign in again to continue." }, { status: 401 });
  }
  if (authState.status !== "verified") {
    return Response.json({ error: "Verify your email before publishing." }, { status: 403 });
  }

  let payload: unknown;

  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_CONFIGURATION_BYTES) {
      return Response.json({ error: "The date form is too large." }, { status: 413 });
    }
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const validation = validateDateFormConfiguration(payload);
  if (!validation.ok) {
    return Response.json(
      { error: "The date form is invalid.", details: validation.errors },
      { status: 400 },
    );
  }

  try {
    const form = await createDateForm(validation.value, authState.creator);
    return Response.json(
      {
        publicId: form.public_id,
        url: `/form/${form.public_id}`,
        createdAt: form.created_at,
        expiresAt: form.expires_at,
      },
      {
        status: 201,
        headers: { "x-date-form-id": form.public_id },
      },
    );
  } catch {
    return Response.json({ error: "Unable to save the date form." }, { status: 502 });
  }
}
