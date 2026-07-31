import nodemailer from "nodemailer";
import { getDateForm } from "../../../../../lib/date-forms/storage";

export const runtime = "nodejs";

type ResponsePayload = {
  answers?: unknown;
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
  const form = await getDateForm(publicId);

  if (!form) return jsonError("This date form is unavailable or expired.", 404);

  let payload: ResponsePayload;
  try {
    payload = (await request.json()) as ResponsePayload;
  } catch {
    return jsonError("Invalid JSON payload.", 400);
  }

  const submittedAnswers =
    payload.answers && typeof payload.answers === "object"
      ? (payload.answers as Record<string, unknown>)
      : {};
  const allowedFields = form.configuration.steps.flatMap((step) => step.fields);
  const answers: Array<{ label: string; value: string }> = [];

  for (const field of allowedFields) {
    const rawValue = submittedAnswers[field.id];
    const value = typeof rawValue === "string" ? rawValue.trim().slice(0, 2000) : "";

    if (field.required && !value) {
      return jsonError(`Please complete “${field.label}”.`, 400);
    }
    if (
      value &&
      (field.type === "select" || field.type === "radio") &&
      !(field.options ?? []).includes(value)
    ) {
      return jsonError(`The answer for “${field.label}” is invalid.`, 400);
    }

    if (value) answers.push({ label: field.label, value });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? "465");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.DATE_RESPONSE_FROM_EMAIL;

  if (!smtpHost || !smtpUser || !smtpPass || !from || !Number.isFinite(smtpPort)) {
    return jsonError("Email delivery is not configured.", 500);
  }

  const textDetails = answers.map(({ label, value }) => `${label}: ${value}`).join("\n");
  const htmlDetails = answers
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
    await Promise.all([
      transporter.sendMail({
        from,
        to: form.configuration.email.recipient,
        replyTo: form.configuration.email.sender,
        subject: `Response to ${form.configuration.title}`,
        text: `A response was submitted.\n\n${textDetails}`,
        html: `<h1>${escapeHtml(form.configuration.title)}</h1><p>A response was submitted.</p><table>${htmlDetails}</table>`,
      }),
      transporter.sendMail({
        from,
        to: form.configuration.email.sender,
        replyTo: form.configuration.email.recipient,
        subject: `Your response to ${form.configuration.title} was sent`,
        text: `Your response was sent successfully.\n\n${textDetails}`,
        html: `<h1>Response sent</h1><p>Your response to ${escapeHtml(form.configuration.title)} was sent successfully.</p><table>${htmlDetails}</table>`,
      }),
    ]);

    return Response.json(
      { ok: true, publicId },
      { headers: { "x-date-form-id": publicId } },
    );
  } catch {
    return jsonError("Unable to send the response email.", 502);
  }
}
