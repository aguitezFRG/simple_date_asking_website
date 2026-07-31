export const MAX_WIZARD_STEPS = 3;
export const MAX_FORM_ELEMENTS = 10;
export const MAX_OPTIONS_PER_FIELD = 12;

export const FIELD_TYPES = ["text", "textarea", "select", "radio", "date"] as const;

export type FormFieldType = (typeof FIELD_TYPES)[number];

export type DateFormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
};

export type DateFormStep = {
  id: string;
  title: string;
  description?: string;
  fields: DateFormField[];
};

export type DateFormConfiguration = {
  version: 1;
  title: string;
  invitationQuestion: string;
  successMessage: string;
  displayDate?: string;
  email: {
    sender: string;
    recipient: string;
  };
  steps: DateFormStep[];
};

export type ValidationResult =
  | { ok: true; value: DateFormConfiguration }
  | { ok: false; errors: string[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ID_PATTERN = /^[a-z][a-z0-9_-]{0,39}$/;

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isFieldType(value: unknown): value is FormFieldType {
  return FIELD_TYPES.includes(value as FormFieldType);
}

export function validateDateFormConfiguration(input: unknown): ValidationResult {
  const errors: string[] = [];
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const title = text(source.title, 100);
  const invitationQuestion = text(source.invitationQuestion, 180);
  const successMessage = text(source.successMessage, 180);
  const displayDate = text(source.displayDate, 80);
  const emailSource =
    source.email && typeof source.email === "object"
      ? (source.email as Record<string, unknown>)
      : {};
  const unsupportedEmailKeys = Object.keys(emailSource).filter(
    (key) => key !== "sender" && key !== "recipient",
  );
  const sender = text(emailSource.sender, 254).toLowerCase();
  const recipient = text(emailSource.recipient, 254).toLowerCase();
  const rawSteps = Array.isArray(source.steps) ? source.steps : [];

  if (!title) errors.push("A form title is required.");
  if (!invitationQuestion) errors.push("An invitation question is required.");
  if (!successMessage) errors.push("A success message is required.");
  if (unsupportedEmailKeys.length > 0) {
    errors.push("Email configuration may contain only sender and recipient.");
  }
  if (!EMAIL_PATTERN.test(sender)) errors.push("Enter a valid sender email address.");
  if (!EMAIL_PATTERN.test(recipient)) errors.push("Enter a valid recipient email address.");
  if (rawSteps.length < 1) errors.push("Add at least one wizard step.");
  if (rawSteps.length > MAX_WIZARD_STEPS) {
    errors.push(`A form can contain at most ${MAX_WIZARD_STEPS} wizard steps.`);
  }

  const seenStepIds = new Set<string>();
  const seenFieldIds = new Set<string>();
  const steps: DateFormStep[] = [];
  let fieldCount = 0;

  rawSteps.slice(0, MAX_WIZARD_STEPS).forEach((rawStep, stepIndex) => {
    const stepSource =
      rawStep && typeof rawStep === "object" ? (rawStep as Record<string, unknown>) : {};
    const id = text(stepSource.id, 40);
    const stepTitle = text(stepSource.title, 100);
    const description = text(stepSource.description, 240);
    const rawFields = Array.isArray(stepSource.fields) ? stepSource.fields : [];

    if (!ID_PATTERN.test(id) || seenStepIds.has(id)) {
      errors.push(`Step ${stepIndex + 1} must have a unique valid identifier.`);
    }
    seenStepIds.add(id);
    if (!stepTitle) errors.push(`Step ${stepIndex + 1} requires a title.`);
    if (rawFields.length < 1) errors.push(`Step ${stepIndex + 1} requires at least one field.`);

    const fields: DateFormField[] = [];
    rawFields.forEach((rawField, fieldIndex) => {
      fieldCount += 1;
      const fieldSource =
        rawField && typeof rawField === "object"
          ? (rawField as Record<string, unknown>)
          : {};
      const fieldId = text(fieldSource.id, 40);
      const type = fieldSource.type;
      const label = text(fieldSource.label, 120);
      const placeholder = text(fieldSource.placeholder, 160);
      const required = fieldSource.required === true;
      const rawOptions = Array.isArray(fieldSource.options) ? fieldSource.options : [];
      const options = rawOptions
        .map((option) => text(option, 100))
        .filter(Boolean)
        .slice(0, MAX_OPTIONS_PER_FIELD);

      if (rawOptions.length > MAX_OPTIONS_PER_FIELD) {
        errors.push(
          `Field ${fieldId || fieldIndex + 1} can contain at most ${MAX_OPTIONS_PER_FIELD} options.`,
        );
      }
      if (!ID_PATTERN.test(fieldId) || seenFieldIds.has(fieldId)) {
        errors.push(
          `Field ${fieldIndex + 1} in step ${stepIndex + 1} must have a unique valid identifier.`,
        );
      }
      seenFieldIds.add(fieldId);
      if (!isFieldType(type)) {
        errors.push(`Field ${fieldId || fieldIndex + 1} has an unsupported type.`);
      }
      if (!label) errors.push(`Field ${fieldId || fieldIndex + 1} requires a label.`);
      if ((type === "select" || type === "radio") && options.length < 2) {
        errors.push(`Field ${fieldId || fieldIndex + 1} requires at least two options.`);
      }

      if (isFieldType(type)) {
        fields.push({
          id: fieldId,
          type,
          label,
          required,
          ...(placeholder ? { placeholder } : {}),
          ...(type === "select" || type === "radio" ? { options } : {}),
        });
      }
    });

    steps.push({
      id,
      title: stepTitle,
      ...(description ? { description } : {}),
      fields,
    });
  });

  if (fieldCount > MAX_FORM_ELEMENTS) {
    errors.push(`A form can contain at most ${MAX_FORM_ELEMENTS} form elements.`);
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      version: 1,
      title,
      invitationQuestion,
      successMessage,
      ...(displayDate ? { displayDate } : {}),
      email: { sender, recipient },
      steps,
    },
  };
}
