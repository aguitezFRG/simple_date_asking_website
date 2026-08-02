import { describe, expect, it } from "vitest";
import {
  MAX_FORM_ELEMENTS,
  MAX_WIZARD_STEPS,
  isPublicFormId,
  validateDateFormAnswers,
  validateDateFormConfiguration,
  type DateFormConfiguration,
} from "../lib/date-forms/schema";
import { validConfiguration } from "./fixtures";

function field(index: number, type = "text") {
  return {
    id: `field_${index}`,
    type,
    label: `Question ${index}`,
    required: true,
  };
}

describe("date-form configuration validation", () => {
  it("accepts and normalizes a valid versioned custom form", () => {
    const configuration = validConfiguration();
    configuration.email.sender = " SENDER@Example.com ";
    const result = validateDateFormConfiguration(configuration);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.email.sender).toBe("sender@example.com");
  });

  it("rejects an absent or unsupported schema version", () => {
    const configuration = { ...validConfiguration(), version: 2 };
    const result = validateDateFormConfiguration(configuration);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("schema version");
  });

  it(`rejects more than ${MAX_WIZARD_STEPS} wizard steps`, () => {
    const configuration = validConfiguration();
    configuration.steps = Array.from({ length: MAX_WIZARD_STEPS + 1 }, (_, index) => ({
      id: `step_${index + 1}`,
      title: `Step ${index + 1}`,
      fields: [field(index + 1) as DateFormConfiguration["steps"][number]["fields"][number]],
    }));
    const result = validateDateFormConfiguration(configuration);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("wizard steps");
  });

  it(`rejects more than ${MAX_FORM_ELEMENTS} total elements`, () => {
    const configuration = validConfiguration();
    configuration.steps[0].fields = Array.from(
      { length: MAX_FORM_ELEMENTS + 1 },
      (_, index) => field(index + 1) as DateFormConfiguration["steps"][number]["fields"][number],
    );
    const result = validateDateFormConfiguration(configuration);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("form elements");
  });

  it("allows only sender and recipient in email configuration", () => {
    const configuration = {
      ...validConfiguration(),
      email: {
        sender: "sender@example.com",
        recipient: "recipient@example.com",
        subject: "Not configurable",
      },
    };
    const result = validateDateFormConfiguration(configuration);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toContain("only sender and recipient");
  });

  it("rejects malformed and adversarial email input with bounded linear validation", () => {
    const configuration = validConfiguration();
    configuration.email.sender = `!@!.${"!.".repeat(50_000)}`;
    configuration.email.recipient = "recipient @example.com";

    const result = validateDateFormConfiguration(configuration);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Sender email must contain at most 254 characters.");
      expect(result.errors).toContain("Enter a valid sender email address.");
      expect(result.errors).toContain("Enter a valid recipient email address.");
    }
  });

  it("rejects duplicate identifiers, options, and oversized values", () => {
    const configuration = validConfiguration();
    configuration.title = "x".repeat(101);
    configuration.steps = [
      { id: "step_1", title: "One", fields: [field(1) as never] },
      {
        id: "step_2",
        title: "Two",
        fields: [{ ...field(1, "select"), options: ["Same", "Same"] } as never],
      },
    ];
    const result = validateDateFormConfiguration(configuration);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("100 characters");
      expect(result.errors.join(" ")).toContain("unique valid identifier");
      expect(result.errors.join(" ")).toContain("options must be unique");
    }
  });
});

describe("date-form answer validation", () => {
  it("rejects missing required, unknown, invalid choice, and malformed date answers", () => {
    const configuration = validConfiguration();
    configuration.steps[0].fields = [
      field(1) as never,
      { ...field(2, "select"), options: ["One", "Two"] } as never,
      field(3, "date") as never,
    ];
    const result = validateDateFormAnswers(configuration, {
      field_1: "",
      field_2: "Three",
      field_3: "2026-02-31",
      injected: "value",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const errors = result.errors.join(" ");
      expect(errors).toContain("Please complete");
      expect(errors).toContain("unknown form field");
      expect(errors).toContain("is invalid");
      expect(errors).toContain("valid date");
    }
  });

  it("accepts and trims valid answers", () => {
    const configuration = validConfiguration();
    const result = validateDateFormAnswers(configuration, { field_1: "  Yes  " });
    expect(result).toEqual({ ok: true, value: { field_1: "Yes" } });
  });
});

describe("public identifiers", () => {
  it("accepts only the exact opaque identifier format", () => {
    expect(isPublicFormId("f_abcdefghijklmnopqrstuvwx")).toBe(true);
    expect(isPublicFormId("123")).toBe(false);
    expect(isPublicFormId("f_short")).toBe(false);
    expect(isPublicFormId("f_../../sensitive-record-1")).toBe(false);
  });
});
