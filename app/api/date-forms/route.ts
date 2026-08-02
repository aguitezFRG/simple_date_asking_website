import { createDateForm } from "../../../lib/date-forms/storage";
import { validateDateFormConfiguration } from "../../../lib/date-forms/schema";

export const runtime = "nodejs";

const MAX_CONFIGURATION_BYTES = 32_000;

export async function POST(request: Request) {
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
    const form = await createDateForm(validation.value);
    return Response.json(
      { publicId: form.public_id, url: `/form/${form.public_id}` },
      {
        status: 201,
        headers: { "x-date-form-id": form.public_id },
      },
    );
  } catch {
    return Response.json({ error: "Unable to save the date form." }, { status: 502 });
  }
}
