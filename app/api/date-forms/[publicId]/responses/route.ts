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

function renderResponseEmail(
  title: string,
  details: Array<{ label: string; value: string }>,
) {
  const detailCards = details
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:0 0 12px;">
            <div style="background:#fff8f8;border:1px solid #f1d9de;border-radius:14px;padding:16px 18px;">
              <div style="color:#8a5260;font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;margin-bottom:6px;">${escapeHtml(label)}</div>
              <div style="color:#2f2528;font-size:16px;line-height:1.55;overflow-wrap:anywhere;white-space:pre-wrap;">${escapeHtml(value)}</div>
            </div>
          </td>
        </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Response to ${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8f2f3;font-family:Arial,Helvetica,sans-serif;color:#2f2528;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8f2f3;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#ffffff;border:1px solid #efdde1;border-radius:22px;overflow:hidden;box-shadow:0 12px 32px rgba(92,49,60,.08);">
            <tr>
              <td style="padding:30px 32px 24px;background:linear-gradient(135deg,#fff4f5 0%,#fbe8ec 100%);border-bottom:1px solid #efdde1;">
                <div style="font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#a35f70;margin-bottom:10px;">Simple Date Asking</div>
                <h1 style="margin:0 0 10px;font-size:28px;line-height:1.25;color:#35272b;">A response was submitted</h1>
                <p style="margin:0;font-size:16px;line-height:1.6;color:#6b555b;">A copy of the submitted answers is included below for both the form creator and respondent.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 12px;">
                <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#a35f70;margin-bottom:8px;">Form</div>
                <div style="font-size:22px;font-weight:700;line-height:1.35;color:#35272b;margin-bottom:22px;">${escapeHtml(title)}</div>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${detailCards}</table>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 30px;">
                <p style="margin:0;padding-top:18px;border-top:1px solid #f0e1e4;font-size:14px;line-height:1.6;color:#766167;">Keep this email for your records.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
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

  const details = [
    { label: "Your email", value: respondentEmail.value },
    ...answers,
  ];
  const textDetails = details.map(({ label, value }) => `${label}: ${value}`).join("\n");
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
      bcc: respondentEmail.value,
      replyTo: respondentEmail.value,
      subject: `Response to ${form.configuration.title}`,
      text: `A response was submitted.\n\n${textDetails}`,
      html: renderResponseEmail(form.configuration.title, details),
    });

    return Response.json(
      { ok: true, publicId },
      { headers: { "x-date-form-id": publicId } },
    );
  } catch {
    return jsonError("Unable to send the response email.", 502);
  }
}
