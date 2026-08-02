import postgres from "postgres";

const deploymentUrl = process.env.DEPLOYMENT_URL?.replace(/\/$/, "");
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const connectionString = process.env.SUPABASE_CONNECTION_STRING;

if (!deploymentUrl || !bypassSecret || !connectionString) {
  throw new Error("Production smoke configuration is incomplete.");
}

const sql = postgres(connectionString, {
  connect_timeout: 10,
  idle_timeout: 20,
  max: 1,
  prepare: false,
  ssl: "require",
});
let publicId = "";

function request(path, init = {}) {
  return fetch(`${deploymentUrl}${path}`, {
    ...init,
    headers: {
      "x-vercel-protection-bypass": bypassSecret,
      ...init.headers,
    },
  });
}

async function expectPage(path, expectedText) {
  const response = await request(path);
  const body = await response.text();
  if (!response.ok || !body.includes(expectedText)) {
    throw new Error(`Smoke check failed for ${path} (${response.status}).`);
  }
}

try {
  await expectPage("/", "Make Your Own Date Form");
  await expectPage("/", "View Demo");
  await expectPage("/demo", "Would you like to be my date?");
  await expectPage("/date=07-13-2026", "July 13, 2026");

  const configuration = {
    version: 1,
    title: "Deployment smoke form",
    invitationQuestion: "Did the generated form load?",
    successMessage: "Deployment smoke complete",
    email: {
      sender: "sender@example.com",
      recipient: "recipient@example.com",
    },
    steps: [
      {
        id: "step_1",
        title: "Verification",
        fields: [
          {
            id: "field_1",
            type: "text",
            label: "Smoke answer",
            required: true,
          },
        ],
      },
    ],
  };
  const createResponse = await request("/api/date-forms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(configuration),
  });
  const created = await createResponse.json();
  publicId = typeof created.publicId === "string" ? created.publicId : "";

  if (createResponse.status !== 201 || !/^f_[A-Za-z0-9_-]{24}$/.test(publicId)) {
    throw new Error(`Custom form creation smoke failed (${createResponse.status}).`);
  }

  const retrieveResponse = await request(`/api/date-forms/${encodeURIComponent(publicId)}`);
  const retrieved = await retrieveResponse.json();
  if (
    !retrieveResponse.ok ||
    retrieved.publicId !== publicId ||
    retrieved.configuration?.title !== configuration.title
  ) {
    throw new Error(`Custom form retrieval smoke failed (${retrieveResponse.status}).`);
  }

  await expectPage(
    `/form/${encodeURIComponent(publicId)}`,
    configuration.invitationQuestion,
  );

  const invalidResponse = await request("/form/not-a-valid-form-id");
  if (invalidResponse.status !== 404) {
    throw new Error(`Invalid identifier smoke failed (${invalidResponse.status}).`);
  }

  console.log("Production routes and temporary custom form smoke passed.");
} finally {
  if (publicId) {
    await sql`delete from public.date_forms where public_id = ${publicId}`;
    console.log("Temporary production smoke form removed.");
  }
  await sql.end();
}
