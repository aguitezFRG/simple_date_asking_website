import { getDateFormLookup } from "../../../../lib/date-forms/storage";
import { isPublicFormId } from "../../../../lib/date-forms/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;

  if (!isPublicFormId(publicId)) {
    return Response.json({ error: "Date form not found." }, { status: 404 });
  }

  try {
    const result = await getDateFormLookup(publicId);

    if (result.status === "expired") {
      return Response.json(
        { code: "FORM_EXPIRED", error: "This form has expired." },
        { status: 410 },
      );
    }

    if (result.status !== "active") {
      return Response.json({ error: "Date form not found." }, { status: 404 });
    }

    const form = result.form;

    return Response.json(
      {
        publicId: form.public_id,
        configuration: form.configuration,
        createdAt: form.created_at,
        expiresAt: form.expires_at,
      },
      { headers: { "x-date-form-id": form.public_id } },
    );
  } catch {
    return Response.json(
      { error: "Date-form storage is not configured." },
      { status: 503 },
    );
  }
}
