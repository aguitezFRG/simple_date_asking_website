import { randomBytes } from "node:crypto";
import FormBuilder from "./form-builder";
import { createDemoBuilderConfiguration } from "../../lib/date-forms/demo";

export const dynamic = "force-dynamic";

export default async function CreateDateFormPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; auth?: string }>;
}) {
  const { preset, auth } = await searchParams;
  const initialConfiguration = preset === "demo"
    ? createDemoBuilderConfiguration(
        (prefix) => `${prefix}_${randomBytes(8).toString("hex")}`,
      )
    : undefined;

  return (
    <FormBuilder
      initialConfiguration={initialConfiguration}
      initialAuthMessage={auth === "verified" || auth === "expired" ? auth : undefined}
    />
  );
}
