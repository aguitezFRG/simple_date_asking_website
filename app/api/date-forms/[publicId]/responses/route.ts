import nodemailer from "nodemailer";
import {
  getDateFormForSubmission,
  getDateFormLookup,
} from "../../../../../lib/date-forms/storage";
import {
  isPublicFormId,
  validateDateFormAnswers,
  validateRespondentEmail,
} from "../../../../../lib/date-forms/schema";

export const runtime = "nodejs";

type ResponsePayload = {
  answers?: unknown;
  respondentEmail?: unknown;
};

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ publicId: string }> },
) {
  const { publicId } = await params;
  if (!isPublicFormId(publicId)) {
    return jsonError("This date form is unavailable or expired.", 404);
  }

  let publicForm;
  try {
    const lookup = await getDateFormLookup(publicId);
    if (lookup.status === "expired") {
      return jsonError("This form has expired.", 410);
    }
    if (lookup.status !== "active") {
      return jsonError("This date form is unavailable.", 404);
    }
    publicForm = lookup.form;
  } catch {
    return jsonError("Date-form storage is unavailable.", 503);
  }

  let payload: ResponsePayload;
  try {
    payload = (await request.json()) as ResponsePayload;
  } catch {
    return jsonError("Invalid JSON payload.", 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonError("Invalid response payload.", 400);
  }

  const payloadKeys = Object.keys(payload as Record<string, unknown>);
  if (payloadKeys.some((key) => key !== "answers" && key !== "respondentEmail")) {
    return jsonError("The response contains unsupported properties.", 400);
  }

  const respondentEmail = validateRespondentEmail(payload.respondentEmail);
  if (!respondentEmail.ok) return jsonError(respondentEmail.errors[0], 400);

  const validation = validateDateFormAnswers(publicForm.configuration, payload.answers);
  if (!validation.ok) return jsonError(validation.errors[0], 400);

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? "465");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.DATE_RESPONSE_FROM_EMAIL;

  if (!smtpHost || !smtpUser || !smtpPass || !from || !Number.isFinite(smtpPort)) {
    return jsonError("Email delivery is not configured.", 500);
  }

  let form;
  try {
    form = await getDateFormForSubmission(publicId);
  } catch {
    return jsonError("Date-form storage is unavailable.", 503);
  }
  if (!form) return jsonError("This form has expired.", 410);

  const finalValidation = validateDateFormAnswers(form.configuration, payload.answers);
  if (!finalValidation.ok) return jsonError(finalValidation.errors[0], 400);
  const allowedFields = form.configuration.steps.flatMap((step) => step.fields);
  const answers = allowedFields.flatMap((field) => {
    const value = finalValidation.value[field.id];
    return value ? [{ label: field.label, value }] : [];
  });

  const textDetails = [
    `Your email: ${respondentEmail.value}`,
    ...answers.map(({ label, value }) => `${label}: ${value}`),
  ].join("\n");
  const htmlDetails = [
    { label: "Your email", value: respondentEmail.value },
    ...answers,
  ]
    .map(
      ({ label, value }) =>
        `<tr><td style="padding:12px;border-bottom:1px solid #ead9dc"><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.sendMail({
      from,
      to: form.creator_email,
      replyTo: respondentEmail.value,
      subject: `Response to ${form.configuration.title}`,
      text: `A response was submitted.\n\n${textDetails}`,
      html: `<h1>${escapeHtml(form.configuration.title)}</h1><p>A response was submitted.</p><table>${htmlDetails}</table>`,
    });

    return Response.json(
      { ok: true, publicId },
      { headers: { "x-date-form-id": publicId } },
    );
  } catch {
    return jsonError("Unable to send the response email.", 502);
  }
}
