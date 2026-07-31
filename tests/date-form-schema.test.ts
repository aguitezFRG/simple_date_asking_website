import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_FORM_ELEMENTS,
  MAX_WIZARD_STEPS,
  validateDateFormConfiguration,
} from "../lib/date-forms/schema.ts";

function field(index: number) {
  return {
    id: `field_${index}`,
    type: "text",
    label: `Question ${index}`,
    required: true,
  };
}

function validConfiguration() {
  return {
    version: 1,
    title: "Date form",
    invitationQuestion: "Would you like to be my date?",
    successMessage: "See you there!",
    email: {
      sender: "sender@example.com",
      recipient: "recipient@example.com",
    },
    steps: [
      {
        id: "step_1",
        title: "Details",
        fields: [field(1)],
      },
    ],
  };
}

test("accepts a valid custom date form", () => {
  const result = validateDateFormConfiguration(validConfiguration());
  assert.equal(result.ok, true);
});

test(`rejects more than ${MAX_WIZARD_STEPS} wizard steps`, () => {
  const configuration = validConfiguration();
  configuration.steps = Array.from({ length: MAX_WIZARD_STEPS + 1 }, (_, index) => ({
    id: `step_${index + 1}`,
    title: `Step ${index + 1}`,
    fields: [field(index + 1)],
  }));

  const result = validateDateFormConfiguration(configuration);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.errors.some((error) => error.includes("wizard steps")));
  }
});

test(`rejects more than ${MAX_FORM_ELEMENTS} total elements`, () => {
  const configuration = validConfiguration();
  configuration.steps[0].fields = Array.from(
    { length: MAX_FORM_ELEMENTS + 1 },
    (_, index) => field(index + 1),
  );

  const result = validateDateFormConfiguration(configuration);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.errors.some((error) => error.includes("form elements")));
  }
});

test("allows only sender and recipient in email configuration", () => {
  const configuration = {
    ...validConfiguration(),
    email: {
      sender: "sender@example.com",
      recipient: "recipient@example.com",
      subject: "Not configurable",
    },
  };

  const result = validateDateFormConfiguration(configuration);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert(result.errors.some((error) => error.includes("only sender and recipient")));
  }
});

test("rejects duplicate field identifiers across steps", () => {
  const configuration = validConfiguration();
  configuration.steps = [
    { id: "step_1", title: "One", fields: [field(1)] },
    { id: "step_2", title: "Two", fields: [field(1)] },
  ];

  const result = validateDateFormConfiguration(configuration);
  assert.equal(result.ok, false);
});
