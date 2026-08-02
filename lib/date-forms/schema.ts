export const DATE_FORM_SCHEMA_VERSION = 2;
export const MAX_WIZARD_STEPS = 3;
export const MAX_FORM_ELEMENTS = 10;
export const MAX_OPTIONS_PER_FIELD = 12;
export const MAX_ANSWER_LENGTH = 2_000;

export const FIELD_TYPES = ["text", "textarea", "select", "radio", "date"] as const;

export type FormFieldType = (typeof FIELD_TYPES)[number];

export type DateFormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  allowOther?: boolean;
};

export type DateFormStep = {
  id: string;
  title: string;
  description?: string;
  fields: DateFormField[];
};

export type DateFormConfiguration = {
  version: typeof DATE_FORM_SCHEMA_VERSION;
  title: string;
  invitationQuestion: string;
  successMessage: string;
  displayDate?: string;
  steps: DateFormStep[];
};

export const SYSTEM_RESPONDENT_EMAIL_FIELD = {
  id: "respondent_email",
  label: "Your email",
  type: "email",
  required: true,
} as const;

export type ValidationResult<T = DateFormConfiguration> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const ID_PATTERN = /^[a-z][a-z0-9_-]{0,39}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PUBLIC_FORM_ID_PATTERN = /^f_[A-Za-z0-9_-]{24}$/;

function normalizedText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isValidEmailAddress(value: string) {
  if (!value || value.length > 254) return false;

  const atIndex = value.indexOf("@");
  if (atIndex <= 0 || atIndex !== value.lastIndexOf("@") || atIndex === value.length - 1) {
    return false;
  }

  for (const character of value) {
    if (character.trim() === "") return false;
  }

  const domain = value.slice(atIndex + 1);
  const finalDotIndex = domain.lastIndexOf(".");
  return finalDotIndex > 0 && finalDotIndex < domain.length - 1;
}

function boundedText(
  value: unknown,
  maxLength: number,
  label: string,
  errors: string[],
) {
  const normalized = normalizedText(value);
  if (normalized.length > maxLength) {
    errors.push(`${label} must contain at most ${maxLength} characters.`);
  }
  return normalized;
}

function isFieldType(value: unknown): value is FormFieldType {
  return FIELD_TYPES.includes(value as FormFieldType);
}

function isCalendarDate(value: string) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function isPublicFormId(value: string) {
  return PUBLIC_FORM_ID_PATTERN.test(value);
}

export function validateDateFormConfiguration(input: unknown): ValidationResult {
  const errors: string[] = [];
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const title = boundedText(source.title, 100, "Form title", errors);
  const invitationQuestion = boundedText(
    source.invitationQuestion,
    180,
    "Invitation question",
    errors,
  );
  const successMessage = boundedText(source.successMessage, 180, "Success message", errors);
  const displayDate = boundedText(source.displayDate, 80, "Display date", errors);
  const rawSteps = Array.isArray(source.steps) ? source.steps : [];
  const allowedConfigurationKeys = new Set([
    "version",
    "title",
    "invitationQuestion",
    "successMessage",
    "displayDate",
    "steps",
  ]);
  if (Object.keys(source).some((key) => !allowedConfigurationKeys.has(key))) {
    errors.push("The form configuration contains unsupported properties.");
  }

  if (source.version !== DATE_FORM_SCHEMA_VERSION) {
    errors.push(`Form schema version must be ${DATE_FORM_SCHEMA_VERSION}.`);
  }
  if (!title) errors.push("A form title is required.");
  if (!invitationQuestion) errors.push("An invitation question is required.");
  if (!successMessage) errors.push("A success message is required.");
  if (rawSteps.length < 1) errors.push("Add at least one wizard step.");
  if (rawSteps.length > MAX_WIZARD_STEPS) {
    errors.push(`A form can contain at most ${MAX_WIZARD_STEPS} wizard steps.`);
  }

  const seenStepIds = new Set<string>();
  const seenFieldIds = new Set<string>();
  const steps: DateFormStep[] = [];
  let fieldCount = 0;

  rawSteps.forEach((rawStep, stepIndex) => {
    const stepSource =
      rawStep && typeof rawStep === "object" && !Array.isArray(rawStep)
        ? (rawStep as Record<string, unknown>)
        : {};
    const id = boundedText(stepSource.id, 40, `Step ${stepIndex + 1} identifier`, errors);
    const stepTitle = boundedText(stepSource.title, 100, `Step ${stepIndex + 1} title`, errors);
    const description = boundedText(
      stepSource.description,
      240,
      `Step ${stepIndex + 1} description`,
      errors,
    );
    const rawFields = Array.isArray(stepSource.fields) ? stepSource.fields : [];
    const allowedStepKeys = new Set(["id", "title", "description", "fields"]);

    if (Object.keys(stepSource).some((key) => !allowedStepKeys.has(key))) {
      errors.push(`Step ${stepIndex + 1} contains unsupported properties.`);
    }

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
        rawField && typeof rawField === "object" && !Array.isArray(rawField)
          ? (rawField as Record<string, unknown>)
          : {};
      const fieldLabel = `Field ${fieldIndex + 1} in step ${stepIndex + 1}`;
      const fieldId = boundedText(fieldSource.id, 40, `${fieldLabel} identifier`, errors);
      const type = fieldSource.type;
      const label = boundedText(fieldSource.label, 120, `${fieldLabel} label`, errors);
      const placeholder = boundedText(
        fieldSource.placeholder,
        160,
        `${fieldLabel} placeholder`,
        errors,
      );
      const required = fieldSource.required === true;
      const allowOther = fieldSource.allowOther === true;
      const rawOptions = Array.isArray(fieldSource.options) ? fieldSource.options : [];
      const allowedFieldKeys = new Set([
        "id",
        "type",
        "label",
        "required",
        "placeholder",
        "options",
        "allowOther",
      ]);
      const options = rawOptions.map((option, optionIndex) =>
        boundedText(option, 100, `${fieldLabel} option ${optionIndex + 1}`, errors),
      );

      if (rawOptions.length > MAX_OPTIONS_PER_FIELD) {
        errors.push(`${fieldLabel} can contain at most ${MAX_OPTIONS_PER_FIELD} options.`);
      }
      if (options.some((option) => !option)) {
        errors.push(`${fieldLabel} options cannot be blank.`);
      }
      if (new Set(options).size !== options.length) {
        errors.push(`${fieldLabel} options must be unique.`);
      }
      if (Object.keys(fieldSource).some((key) => !allowedFieldKeys.has(key))) {
        errors.push(`${fieldLabel} contains unsupported properties.`);
      }
      if (!ID_PATTERN.test(fieldId) || seenFieldIds.has(fieldId)) {
        errors.push(`${fieldLabel} must have a unique valid identifier.`);
      }
      seenFieldIds.add(fieldId);
      if (!isFieldType(type)) errors.push(`${fieldLabel} has an unsupported type.`);
      if (!label) errors.push(`${fieldLabel} requires a label.`);
      if ((type === "select" || type === "radio") && options.length < 2) {
        errors.push(`${fieldLabel} requires at least two options.`);
      }

      if (isFieldType(type)) {
        fields.push({
          id: fieldId,
          type,
          label,
          required,
          ...(placeholder ? { placeholder } : {}),
          ...(type === "select" || type === "radio" ? { options } : {}),
          ...(allowOther && (type === "select" || type === "radio")
            ? { allowOther: true }
            : {}),
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
  if (errors.length > 0) return { ok: false, errors: [...new Set(errors)] };

  return {
    ok: true,
    value: {
      version: DATE_FORM_SCHEMA_VERSION,
      title,
      invitationQuestion,
      successMessage,
      ...(displayDate ? { displayDate } : {}),
      steps,
    },
  };
}

export function validateDateFormAnswers(
  configuration: DateFormConfiguration,
  input: unknown,
): ValidationResult<Record<string, string>> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["Answers must be an object."] };
  }

  const source = input as Record<string, unknown>;
  const fields = configuration.steps.flatMap((step) => step.fields);
  const allowedIds = new Set(fields.map((field) => field.id));
  const errors: string[] = [];
  const answers: Record<string, string> = {};

  for (const key of Object.keys(source)) {
    if (!allowedIds.has(key)) errors.push("The response contains an unknown form field.");
  }

  for (const field of fields) {
    const rawValue = source[field.id];
    if (rawValue !== undefined && typeof rawValue !== "string") {
      errors.push(`The answer for “${field.label}” must be text.`);
      continue;
    }
    const value = normalizedText(rawValue);
    if (value.length > MAX_ANSWER_LENGTH) {
      errors.push(`The answer for “${field.label}” is too long.`);
      continue;
    }
    if (field.required && !value) errors.push(`Please complete “${field.label}”.`);
    if (
      value &&
      (field.type === "select" || field.type === "radio") &&
      !field.allowOther &&
      !(field.options ?? []).includes(value)
    ) {
      errors.push(`The answer for “${field.label}” is invalid.`);
    }
    if (value && field.type === "date" && !isCalendarDate(value)) {
      errors.push(`The answer for “${field.label}” must be a valid date.`);
    }
    if (value) answers[field.id] = value;
  }

  return errors.length > 0
    ? { ok: false, errors: [...new Set(errors)] }
    : { ok: true, value: answers };
}

export function validateRespondentEmail(input: unknown): ValidationResult<string> {
  const email = normalizedText(input).toLowerCase();
  if (!email) return { ok: false, errors: ["Your email is required."] };
  if (!isValidEmailAddress(email)) {
    return { ok: false, errors: ["Enter a valid email address."] };
  }
  return { ok: true, value: email };
}
