import { getDateForm } from "../../../../lib/date-forms/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;

  try {
    const form = await getDateForm(publicId);

    if (!form) {
      return Response.json({ error: "Date form not found." }, { status: 404 });
    }

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
