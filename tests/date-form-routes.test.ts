// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { validConfiguration } from "./fixtures";

const storage = vi.hoisted(() => ({
  createDateForm: vi.fn(),
  getDateFormLookup: vi.fn(),
  getDateFormForSubmission: vi.fn(),
}));

const auth = vi.hoisted(() => ({
  getCreatorAuthState: vi.fn(),
}));

const mailer = vi.hoisted(() => ({
  sendMail: vi.fn(),
}));

vi.mock("../lib/date-forms/storage", () => storage);
vi.mock("../lib/supabase/auth", () => auth);
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({ sendMail: mailer.sendMail }),
  },
}));

import { POST as createForm } from "../app/api/date-forms/route";
import { GET as retrieveForm } from "../app/api/date-forms/[publicId]/route";
import { POST as submitResponse } from "../app/api/date-forms/[publicId]/responses/route";
import { POST as submitDefaultResponse } from "../app/api/submit-date/route";

const publicId = "f_abcdefghijklmnopqrstuvwx";
const creator = {
  userId: "b0a7fe8f-f3df-4476-bec5-48bc54746c6c",
  email: "creator@example.com",
};

function storedForm() {
  return {
    id: "8da2fa06-2435-4fcf-8b3c-01025819f17f",
    public_id: publicId,
    configuration: validConfiguration(),
    created_at: "2026-08-03T00:00:00.000Z",
    expires_at: "2026-08-06T00:00:00.000Z",
    is_active: true,
  };
}

beforeEach(() => {
  storage.createDateForm.mockReset();
  storage.getDateFormLookup.mockReset();
  storage.getDateFormForSubmission.mockReset();
  auth.getCreatorAuthState.mockReset();
  auth.getCreatorAuthState.mockResolvedValue({ status: "verified", creator });
  mailer.sendMail.mockReset();
});

describe("POST /api/date-forms", () => {
  it("validates on the server and saves a finalized form", async () => {
    storage.createDateForm.mockResolvedValue(storedForm());
    const response = await createForm(
      new Request("http://localhost/api/date-forms", {
        method: "POST",
        body: JSON.stringify(validConfiguration()),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      publicId,
      url: `/form/${publicId}`,
      createdAt: "2026-08-03T00:00:00.000Z",
      expiresAt: "2026-08-06T00:00:00.000Z",
    });
    expect(storage.createDateForm).toHaveBeenCalledWith(validConfiguration(), creator);
  });

  it("requires a trusted verified session and rejects forged creator fields", async () => {
    auth.getCreatorAuthState.mockResolvedValueOnce({ status: "signed_out" });
    const signedOut = await createForm(new Request("http://localhost/api/date-forms", {
      method: "POST",
      body: JSON.stringify(validConfiguration()),
    }));
    expect(signedOut.status).toBe(401);

    auth.getCreatorAuthState.mockResolvedValueOnce({ status: "unverified", email: "creator@example.com" });
    const unverified = await createForm(new Request("http://localhost/api/date-forms", {
      method: "POST",
      body: JSON.stringify(validConfiguration()),
    }));
    expect(unverified.status).toBe(403);

    auth.getCreatorAuthState.mockResolvedValueOnce({ status: "verified", creator });
    const forged = await createForm(new Request("http://localhost/api/date-forms", {
      method: "POST",
      body: JSON.stringify({
        ...validConfiguration(),
        creatorEmail: "attacker@example.com",
        creatorUserId: "attacker",
        expiresAt: "2099-01-01T00:00:00Z",
      }),
    }));
    expect(forged.status).toBe(400);
    expect(storage.createDateForm).not.toHaveBeenCalled();
  });

  it("rejects invalid, malformed, and oversized configurations without saving", async () => {
    const invalid = validConfiguration();
    invalid.steps = [];
    const invalidResponse = await createForm(
      new Request("http://localhost/api/date-forms", {
        method: "POST",
        body: JSON.stringify(invalid),
      }),
    );
    expect(invalidResponse.status).toBe(400);

    const malformedResponse = await createForm(
      new Request("http://localhost/api/date-forms", { method: "POST", body: "{" }),
    );
    expect(malformedResponse.status).toBe(400);

    const oversizedResponse = await createForm(
      new Request("http://localhost/api/date-forms", {
        method: "POST",
        body: JSON.stringify({ padding: "x".repeat(32_001) }),
      }),
    );
    expect(oversizedResponse.status).toBe(413);
    expect(storage.createDateForm).not.toHaveBeenCalled();
  });

  it("returns a stable failure without exposing database details", async () => {
    storage.createDateForm.mockRejectedValue(new Error("secret database detail"));
    const response = await createForm(
      new Request("http://localhost/api/date-forms", {
        method: "POST",
        body: JSON.stringify(validConfiguration()),
      }),
    );
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("secret database detail");
  });
});

describe("GET /api/date-forms/[publicId]", () => {
  it("retrieves a saved form using the route identifier", async () => {
    storage.getDateFormLookup.mockResolvedValue({ status: "active", form: storedForm() });
    const response = await retrieveForm(new Request(`http://localhost/api/date-forms/${publicId}`), {
      params: Promise.resolve({ publicId }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-date-form-id")).toBe(publicId);
    const payload = await response.json();
    expect(payload.configuration.title).toBe("Date form");
    expect(JSON.stringify(payload)).not.toContain(creator.email);
  });

  it("handles malformed, missing, disabled, or expired identifiers as unavailable", async () => {
    const malformed = await retrieveForm(new Request("http://localhost/api/date-forms/not-valid"), {
      params: Promise.resolve({ publicId: "not-valid" }),
    });
    expect(malformed.status).toBe(404);
    expect(storage.getDateFormLookup).not.toHaveBeenCalled();

    storage.getDateFormLookup.mockResolvedValue({ status: "unavailable" });
    const unavailable = await retrieveForm(
      new Request(`http://localhost/api/date-forms/${publicId}`),
      { params: Promise.resolve({ publicId }) },
    );
    expect(unavailable.status).toBe(404);

    storage.getDateFormLookup.mockResolvedValue({ status: "expired" });
    const expired = await retrieveForm(
      new Request(`http://localhost/api/date-forms/${publicId}`),
      { params: Promise.resolve({ publicId }) },
    );
    expect(expired.status).toBe(410);
    expect(await expired.json()).toMatchObject({ code: "FORM_EXPIRED" });
  });
});

describe("POST /api/date-forms/[publicId]/responses", () => {
  it("applies server-side answer validation before sending email", async () => {
    storage.getDateFormLookup.mockResolvedValue({ status: "active", form: storedForm() });
    storage.getDateFormForSubmission.mockResolvedValue({
      ...storedForm(),
      creator_email: creator.email,
    });
    const response = await submitResponse(
      new Request(`http://localhost/api/date-forms/${publicId}/responses`, {
        method: "POST",
        body: JSON.stringify({
          respondentEmail: "respondent@example.com",
          answers: { field_1: "", injected: "value" },
        }),
      }),
      { params: Promise.resolve({ publicId }) },
    );
    expect(response.status).toBe(400);
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it("does not trust a browser-supplied identifier header", async () => {
    storage.getDateFormLookup.mockResolvedValue({ status: "unavailable" });
    const response = await submitResponse(
      new Request(`http://localhost/api/date-forms/${publicId}/responses`, {
        method: "POST",
        headers: { "x-date-form-id": "f_zzzzzzzzzzzzzzzzzzzzzzzz" },
        body: JSON.stringify({ respondentEmail: "respondent@example.com", answers: { field_1: "Yes" } }),
      }),
      { params: Promise.resolve({ publicId }) },
    );
    expect(response.status).toBe(404);
    expect(storage.getDateFormLookup).toHaveBeenCalledWith(publicId);
  });

  it("requires respondent email and sends only to the private creator destination", async () => {
    storage.getDateFormLookup.mockResolvedValue({ status: "active", form: storedForm() });
    storage.getDateFormForSubmission.mockResolvedValue({
      ...storedForm(),
      creator_email: creator.email,
    });
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_PORT", "465");
    vi.stubEnv("SMTP_USER", "smtp-user");
    vi.stubEnv("SMTP_PASS", "smtp-pass");
    vi.stubEnv("DATE_RESPONSE_FROM_EMAIL", "from@example.com");
    mailer.sendMail.mockResolvedValue({});

    const missing = await submitResponse(
      new Request(`http://localhost/api/date-forms/${publicId}/responses`, {
        method: "POST",
        body: JSON.stringify({ answers: { field_1: "Yes" } }),
      }),
      { params: Promise.resolve({ publicId }) },
    );
    expect(missing.status).toBe(400);

    const valid = await submitResponse(
      new Request(`http://localhost/api/date-forms/${publicId}/responses`, {
        method: "POST",
        body: JSON.stringify({ respondentEmail: " Respondent@Example.com ", answers: { field_1: "Yes" } }),
      }),
      { params: Promise.resolve({ publicId }) },
    );
    expect(valid.status).toBe(200);
    expect(mailer.sendMail).toHaveBeenCalledOnce();
    expect(mailer.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: creator.email,
      replyTo: "respondent@example.com",
      text: expect.stringContaining("Your email: respondent@example.com"),
    }));
  });
});

describe("POST /api/submit-date", () => {
  it("does not permit the presentation-only demo to choose an email destination", async () => {
    const response = await submitDefaultResponse();

    expect(response.status).toBe(410);
    expect((await response.json()).error).toContain("Demo responses are not delivered");
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });
});
