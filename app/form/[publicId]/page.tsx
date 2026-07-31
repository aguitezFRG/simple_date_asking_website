import { notFound } from "next/navigation";
import { getDateForm } from "../../../lib/date-forms/storage";
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
