import { notFound } from "next/navigation";
import { getDateFormLookup } from "../../../lib/date-forms/storage";
import { isPublicFormId } from "../../../lib/date-forms/schema";
import CustomDateForm from "./custom-date-form";
import ExpiredDateForm from "./expired-form";

export const dynamic = "force-dynamic";

export default async function PublicDateFormPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  if (!isPublicFormId(publicId)) notFound();
  const result = await getDateFormLookup(publicId);

  if (result.status === "expired") return <ExpiredDateForm />;
  if (result.status !== "active") notFound();
  const form = result.form;

  return (
    <CustomDateForm
      configuration={form.configuration}
      publicId={form.public_id}
      expiresAt={form.expires_at!}
    />
  );
}
