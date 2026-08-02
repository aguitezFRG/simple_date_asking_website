import nodemailer from "nodemailer";

export const runtime = "nodejs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Submission = {
  recipientEmail?: unknown;
  respondentEmail?: unknown;
  lunchPlace?: unknown;
  activity?: unknown;
};

function textField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

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

function responseText({
  intro,
  recipientEmail,
  respondentEmail,
  lunchPlace,
  activity,
}: {
  intro: string;
  recipientEmail: string;
  respondentEmail: string;
  lunchPlace: string;
  activity: string;
}) {
  return [
    intro,
    "",
    "Date details:",
    `Lunch place: ${lunchPlace}`,
    `Pre-going-home activity: ${activity}`,
    "",
    `Recipient email: ${recipientEmail}`,
    `Respondent email: ${respondentEmail}`,
  ].join("\n");
}

function responseHtml({
  eyebrow,
  title,
  message,
  recipientEmail,
  respondentEmail,
  lunchPlace,
  activity,
}: {
  eyebrow: string;
  title: string;
  message: string;
  recipientEmail: string;
  respondentEmail: string;
  lunchPlace: string;
  activity: string;
}) {
  const details = [
    ["Lunch place", lunchPlace],
    ["Before going home", activity],
    ["Recipient email", recipientEmail],
    ["Respondent email", respondentEmail],
  ];

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f6f0f1;color:#3c2d31;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f0f1;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffaf9;border:1px solid #ead9dc;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#d77d8c;padding:26px 28px;color:#ffffff;">
                <p style="margin:0 0 8px;font-size:12px;line-height:1.4;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:0;font-size:28px;line-height:1.18;font-weight:800;">${escapeHtml(title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 22px;font-size:16px;line-height:1.65;color:#59474c;">${escapeHtml(message)}</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 10px;">
                  ${details
                    .map(
                      ([label, value]) => `<tr>
                    <td style="padding:14px 16px;background:#f7e8eb;border:1px solid #ead0d5;border-radius:12px;">
                      <p style="margin:0 0 5px;font-size:12px;line-height:1.3;font-weight:700;color:#8c4d5a;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(label)}</p>
                      <p style="margin:0;font-size:16px;line-height:1.45;color:#33282b;font-weight:700;">${escapeHtml(value)}</p>
                    </td>
                  </tr>`,
                    )
                    .join("")}
                </table>
                <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#7a686d;">This message was sent automatically from the date invitation form.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function POST(request: Request) {
  let body: Submission;

  try {
    body = (await request.json()) as Submission;
  } catch {
    return jsonError("Invalid JSON payload.", 400);
  }

  const recipientEmail = textField(body.recipientEmail);
  const respondentEmail = textField(body.respondentEmail);
  const lunchPlace = textField(body.lunchPlace);
  const activity = textField(body.activity);

  if (!EMAIL_PATTERN.test(recipientEmail)) {
    return jsonError("Enter a valid recipient email address.", 400);
  }

  if (!EMAIL_PATTERN.test(respondentEmail)) {
    return jsonError("Enter a valid email address.", 400);
  }

  if (!lunchPlace || !activity) {
    return jsonError("Choose a lunch place and activity.", 400);
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? "465");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.DATE_RESPONSE_FROM_EMAIL;

  if (!smtpHost || !smtpUser || !smtpPass || !from || !Number.isFinite(smtpPort)) {
    return jsonError("Email delivery is not configured.", 500);
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  try {
    await Promise.all([
      transporter.sendMail({
        from,
        to: recipientEmail,
        replyTo: respondentEmail,
        subject: "You have a date invitation response",
        text: responseText({
          intro: "Good news. Your date invitation got a yes.",
          recipientEmail,
          respondentEmail,
          lunchPlace,
          activity,
        }),
        html: responseHtml({
          eyebrow: "Date invitation",
          title: "You got a yes",
          message:
            "Good news. Your invitation was accepted, and the date details are ready below.",
          recipientEmail,
          respondentEmail,
          lunchPlace,
          activity,
        }),
      }),
      transporter.sendMail({
        from,
        to: respondentEmail,
        replyTo: respondentEmail,
        subject: "Your date response was sent",
        text: responseText({
          intro: "Your date response was sent successfully.",
          recipientEmail,
          respondentEmail,
          lunchPlace,
          activity,
        }),
        html: responseHtml({
          eyebrow: "Response sent",
          title: "Your date details are confirmed",
          message:
            "Your response was sent successfully. Here is a copy of the date plan you chose.",
          recipientEmail,
          respondentEmail,
          lunchPlace,
          activity,
        }),
      }),
    ]);

    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Date response email delivery failed.", {
        name: error.name,
        message: error.message,
        code: "code" in error ? error.code : undefined,
        responseCode: "responseCode" in error ? error.responseCode : undefined,
      });
    } else {
      console.error("Date response email delivery failed.", error);
    }

    return jsonError("Unable to send the response email.", 502);
  }
}
