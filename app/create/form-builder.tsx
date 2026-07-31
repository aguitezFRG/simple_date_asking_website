"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FIELD_TYPES,
  MAX_FORM_ELEMENTS,
  MAX_WIZARD_STEPS,
  type DateFormConfiguration,
  type DateFormField,
  type DateFormStep,
  type FormFieldType,
} from "../../lib/date-forms/schema";

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

function newField(): DateFormField {
  return {
    id: makeId("field"),
    type: "text",
    label: "New question",
    required: true,
    placeholder: "Type your answer",
  };
}

function newStep(index: number): DateFormStep {
  return {
    id: makeId("step"),
    title: `Step ${index}`,
    fields: [newField()],
  };
}

const fieldTypeLabels: Record<FormFieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  select: "Dropdown",
  radio: "Multiple choice",
  date: "Date",
};

export default function FormBuilder() {
  const router = useRouter();
  const [title, setTitle] = useState("Our date invitation");
  const [invitationQuestion, setInvitationQuestion] = useState(
    "Would you like to be my date?",
  );
  const [successMessage, setSuccessMessage] = useState("See you there!");
  const [displayDate, setDisplayDate] = useState("");
  const [sender, setSender] = useState("");
  const [recipient, setRecipient] = useState("");
  const [steps, setSteps] = useState<DateFormStep[]>([newStep(1)]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fieldCount = useMemo(
    () => steps.reduce((total, step) => total + step.fields.length, 0),
    [steps],
  );

  function updateStep(stepIndex: number, patch: Partial<DateFormStep>) {
    setSteps((current) =>
      current.map((step, index) => (index === stepIndex ? { ...step, ...patch } : step)),
    );
  }

  function updateField(
    stepIndex: number,
    fieldIndex: number,
    patch: Partial<DateFormField>,
  ) {
    setSteps((current) =>
      current.map((step, currentStepIndex) => {
        if (currentStepIndex !== stepIndex) return step;
        return {
          ...step,
          fields: step.fields.map((field, currentFieldIndex) =>
            currentFieldIndex === fieldIndex ? { ...field, ...patch } : field,
          ),
        };
      }),
    );
  }

  function addStep() {
    if (steps.length >= MAX_WIZARD_STEPS || fieldCount >= MAX_FORM_ELEMENTS) return;
    setSteps((current) => [...current, newStep(current.length + 1)]);
  }

  function removeStep(stepIndex: number) {
    if (steps.length === 1) return;
    setSteps((current) => current.filter((_, index) => index !== stepIndex));
  }

  function addField(stepIndex: number) {
    if (fieldCount >= MAX_FORM_ELEMENTS) return;
    setSteps((current) =>
      current.map((step, index) =>
        index === stepIndex ? { ...step, fields: [...step.fields, newField()] } : step,
      ),
    );
  }

  function removeField(stepIndex: number, fieldIndex: number) {
    setSteps((current) =>
      current.map((step, index) => {
        if (index !== stepIndex || step.fields.length === 1) return step;
        return {
          ...step,
          fields: step.fields.filter((_, currentFieldIndex) => currentFieldIndex !== fieldIndex),
        };
      }),
    );
  }

  async function saveForm() {
    setError("");
    setIsSaving(true);

    const configuration: DateFormConfiguration = {
      version: 1,
      title,
      invitationQuestion,
      successMessage,
      ...(displayDate.trim() ? { displayDate: displayDate.trim() } : {}),
      email: { sender, recipient },
      steps,
    };

    try {
      const response = await fetch("/api/date-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configuration),
      });
      const result = (await response.json()) as {
        error?: string;
        details?: string[];
        url?: string;
      };

      if (!response.ok || !result.url) {
        throw new Error(result.details?.join(" ") || result.error || "Unable to save form.");
      }

      router.push(`${result.url}?created=1`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save form.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-[8px] border-2 border-[var(--soft-gray)] bg-white/90 p-5 shadow-xl shadow-[var(--thistle)] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)]">
          Custom date form
        </p>
        <h1 className="mt-3 text-3xl font-black text-[var(--ink)] sm:text-5xl">
          Build your invitation
        </h1>
        <p className="mt-3 text-[var(--ink)]">
          Up to {MAX_WIZARD_STEPS} wizard steps and {MAX_FORM_ELEMENTS} total form elements.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <TextInput label="Form title" value={title} onChange={setTitle} />
          <TextInput label="Display date (optional)" value={displayDate} onChange={setDisplayDate} />
          <TextInput
            label="Invitation question"
            value={invitationQuestion}
            onChange={setInvitationQuestion}
          />
          <TextInput label="Success message" value={successMessage} onChange={setSuccessMessage} />
        </div>

        <fieldset className="mt-8 rounded-[8px] border border-[var(--soft-gray)] p-5">
          <legend className="px-2 text-lg font-black text-[var(--ink)]">Email delivery</legend>
          <p className="mb-4 text-sm text-[var(--ink)]">
            This section is intentionally limited to exactly two values.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput label="Sender email" type="email" value={sender} onChange={setSender} />
            <TextInput
              label="Recipient email"
              type="email"
              value={recipient}
              onChange={setRecipient}
            />
          </div>
        </fieldset>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-[var(--ink)]">Wizard steps</h2>
            <p className="text-sm text-[var(--ink)]">
              {steps.length}/{MAX_WIZARD_STEPS} steps · {fieldCount}/{MAX_FORM_ELEMENTS} elements
            </p>
          </div>
          <button
            className="h-11 rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--icy-blue)] px-4 font-bold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={addStep}
            disabled={steps.length >= MAX_WIZARD_STEPS || fieldCount >= MAX_FORM_ELEMENTS}
          >
            + Step
          </button>
        </div>

        <div className="mt-5 grid gap-6">
          {steps.map((step, stepIndex) => (
            <section
              key={step.id}
              className="rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--pastel-petal)]/35 p-4 sm:p-6"
            >
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-0 flex-1">
                  <TextInput
                    label={`Step ${stepIndex + 1} title`}
                    value={step.title}
                    onChange={(value) => updateStep(stepIndex, { title: value })}
                  />
                </div>
                <button
                  type="button"
                  className="h-11 rounded-[8px] border border-[var(--soft-gray)] bg-white px-4 font-bold text-[var(--ink)] disabled:opacity-40"
                  disabled={steps.length === 1}
                  onClick={() => removeStep(stepIndex)}
                >
                  Remove step
                </button>
              </div>

              <div className="mt-5 grid gap-4">
                {step.fields.map((field, fieldIndex) => (
                  <fieldset
                    key={field.id}
                    className="rounded-[8px] border border-[var(--soft-gray)] bg-white p-4"
                  >
                    <legend className="px-2 text-sm font-black text-[var(--ink)]">
                      Field {fieldIndex + 1}
                    </legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextInput
                        label="Label"
                        value={field.label}
                        onChange={(value) => updateField(stepIndex, fieldIndex, { label: value })}
                      />
                      <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
                        Field type
                        <select
                          className="h-11 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 text-base"
                          value={field.type}
                          onChange={(event) =>
                            updateField(stepIndex, fieldIndex, {
                              type: event.target.value as FormFieldType,
                              options:
                                event.target.value === "select" || event.target.value === "radio"
                                  ? field.options ?? ["Option 1", "Option 2"]
                                  : undefined,
                            })
                          }
                        >
                          {FIELD_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {fieldTypeLabels[type]}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {(field.type === "select" || field.type === "radio") && (
                      <label className="mt-4 grid gap-2 text-sm font-semibold text-[var(--ink)]">
                        Options (one per line)
                        <textarea
                          className="min-h-28 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 py-2 text-base"
                          value={(field.options ?? []).join("\n")}
                          onChange={(event) =>
                            updateField(stepIndex, fieldIndex, {
                              options: event.target.value.split("\n"),
                            })
                          }
                        />
                      </label>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(event) =>
                            updateField(stepIndex, fieldIndex, { required: event.target.checked })
                          }
                        />
                        Required
                      </label>
                      <button
                        type="button"
                        className="h-10 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 text-sm font-bold text-[var(--ink)] disabled:opacity-40"
                        disabled={step.fields.length === 1}
                        onClick={() => removeField(stepIndex, fieldIndex)}
                      >
                        Remove field
                      </button>
                    </div>
                  </fieldset>
                ))}
              </div>

              <button
                className="mt-4 h-11 rounded-[8px] border-2 border-[var(--soft-gray)] bg-white px-4 font-bold text-[var(--ink)] disabled:opacity-40"
                type="button"
                onClick={() => addField(stepIndex)}
                disabled={fieldCount >= MAX_FORM_ELEMENTS}
              >
                + Field
              </button>
            </section>
          ))}
        </div>

        {error ? (
          <p role="alert" className="mt-6 rounded-[8px] bg-[var(--baby-pink)] px-4 py-3 text-sm font-semibold text-[var(--ink)]">
            {error}
          </p>
        ) : null}

        <button
          className="mt-8 h-14 w-full rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--baby-pink)] px-5 text-lg font-black text-[var(--ink)] outline outline-2 outline-[var(--soft-gray)] disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          disabled={isSaving}
          onClick={saveForm}
        >
          {isSaving ? "Creating link..." : "Finalize and create link"}
        </button>
      </section>
    </main>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
      {label}
      <input
        className="h-11 min-w-0 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 text-base font-normal"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
