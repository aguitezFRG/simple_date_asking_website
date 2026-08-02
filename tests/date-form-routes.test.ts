// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { validConfiguration } from "./fixtures";

const storage = vi.hoisted(() => ({
  createDateForm: vi.fn(),
  getDateForm: vi.fn(),
}));

const mailer = vi.hoisted(() => ({
  sendMail: vi.fn(),
}));

vi.mock("../lib/date-forms/storage", () => storage);
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

function storedForm() {
  return {
    id: "8da2fa06-2435-4fcf-8b3c-01025819f17f",
    public_id: publicId,
    configuration: validConfiguration(),
    created_at: "2026-08-03T00:00:00.000Z",
    expires_at: null,
    is_active: true,
  };
}

beforeEach(() => {
  storage.createDateForm.mockReset();
  storage.getDateForm.mockReset();
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
    expect(await response.json()).toEqual({ publicId, url: `/form/${publicId}` });
    expect(storage.createDateForm).toHaveBeenCalledWith(validConfiguration());
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
    storage.getDateForm.mockResolvedValue(storedForm());
    const response = await retrieveForm(new Request(`http://localhost/api/date-forms/${publicId}`), {
      params: Promise.resolve({ publicId }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-date-form-id")).toBe(publicId);
    expect((await response.json()).configuration.title).toBe("Date form");
  });

  it("handles malformed, missing, disabled, or expired identifiers as unavailable", async () => {
    const malformed = await retrieveForm(new Request("http://localhost/api/date-forms/not-valid"), {
      params: Promise.resolve({ publicId: "not-valid" }),
    });
    expect(malformed.status).toBe(404);
    expect(storage.getDateForm).not.toHaveBeenCalled();

    storage.getDateForm.mockResolvedValue(null);
    const unavailable = await retrieveForm(
      new Request(`http://localhost/api/date-forms/${publicId}`),
      { params: Promise.resolve({ publicId }) },
    );
    expect(unavailable.status).toBe(404);
  });
});

describe("POST /api/date-forms/[publicId]/responses", () => {
  it("applies server-side answer validation before sending email", async () => {
    storage.getDateForm.mockResolvedValue(storedForm());
    const response = await submitResponse(
      new Request(`http://localhost/api/date-forms/${publicId}/responses`, {
        method: "POST",
        body: JSON.stringify({ answers: { field_1: "", injected: "value" } }),
      }),
      { params: Promise.resolve({ publicId }) },
    );
    expect(response.status).toBe(400);
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it("does not trust a browser-supplied identifier header", async () => {
    storage.getDateForm.mockResolvedValue(null);
    const response = await submitResponse(
      new Request(`http://localhost/api/date-forms/${publicId}/responses`, {
        method: "POST",
        headers: { "x-date-form-id": "f_zzzzzzzzzzzzzzzzzzzzzzzz" },
        body: JSON.stringify({ answers: { field_1: "Yes" } }),
      }),
      { params: Promise.resolve({ publicId }) },
    );
    expect(response.status).toBe(404);
    expect(storage.getDateForm).toHaveBeenCalledWith(publicId);
  });
});

describe("POST /api/submit-date", () => {
  it("rejects adversarial email input with the shared linear validator", async () => {
    const response = await submitDefaultResponse(
      new Request("http://localhost/api/submit-date", {
        method: "POST",
        body: JSON.stringify({
          recipientEmail: `!@!.${"!.".repeat(50_000)}`,
          respondentEmail: "respondent@example.com",
          lunchPlace: "Cafe",
          activity: "Walk",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Enter a valid recipient email address.",
    });
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });
});
