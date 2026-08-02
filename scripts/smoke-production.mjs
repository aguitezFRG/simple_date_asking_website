const deploymentUrl = process.env.DEPLOYMENT_URL?.replace(/\/$/, "");
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

if (!deploymentUrl || !bypassSecret) {
  throw new Error("Production smoke configuration is incomplete.");
}

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
  const expected = Array.isArray(expectedText) ? expectedText : [expectedText];
  if (!response.ok || expected.some((text) => !body.includes(text))) {
    throw new Error(`Smoke check failed for ${path} (${response.status}).`);
  }
}

await expectPage("/", ["Make Your Own Date Form", "View Demo"]);
await expectPage("/demo", ["Would you like to be my date?", "Use Demo Form", "Back to Home"]);
await expectPage("/date=07-13-2026", "July 13, 2026");

const authResponse = await request("/api/creator-auth");
const authBody = await authResponse.json();
if (!authResponse.ok || !["signed_out", "unverified", "verified"].includes(authBody.status)) {
  throw new Error(`Creator Auth smoke failed (${authResponse.status}).`);
}

const deprecatedDemoSubmission = await request("/api/submit-date", { method: "POST" });
if (deprecatedDemoSubmission.status !== 410) {
  throw new Error(`Demo submission security smoke failed (${deprecatedDemoSubmission.status}).`);
}

const invalidResponse = await request("/form/not-a-valid-form-id");
if (invalidResponse.status !== 404) {
  throw new Error(`Invalid identifier smoke failed (${invalidResponse.status}).`);
}

console.log("Production route, Auth, and public-destination security smoke passed.");
