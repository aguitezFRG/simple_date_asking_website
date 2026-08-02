import { notFound } from "next/navigation";
import { getDateForm } from "../../../lib/date-forms/storage";
import { isPublicFormId } from "../../../lib/date-forms/schema";
import CustomDateForm from "./custom-date-form";

export const dynamic = "force-dynamic";

export default async function PublicDateFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const [{ publicId }, { created }] = await Promise.all([params, searchParams]);
  if (!isPublicFormId(publicId)) notFound();
  const form = await getDateForm(publicId);

  if (!form) notFound();

  return (
    <CustomDateForm
      configuration={form.configuration}
      publicId={form.public_id}
      showShareNotice={created === "1"}
    />
  );
}
