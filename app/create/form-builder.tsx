"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DATE_FORM_SCHEMA_VERSION,
  FIELD_TYPES,
  MAX_FORM_ELEMENTS,
  MAX_OPTIONS_PER_FIELD,
  MAX_WIZARD_STEPS,
  validateDateFormConfiguration,
  type DateFormConfiguration,
  type DateFormField,
  type DateFormStep,
  type FormFieldType,
} from "../../lib/date-forms/schema";

type EditorMode = "edit" | "preview";

function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
}

function newField(id = makeId("field")): DateFormField {
  return {
    id,
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

const initialSteps: DateFormStep[] = [
  {
    id: "step_1",
    title: "Step 1",
    fields: [newField("field_1")],
  },
];

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
  const [steps, setSteps] = useState<DateFormStep[]>(() => initialSteps);
  const [mode, setMode] = useState<EditorMode>("edit");
  const [previewConfiguration, setPreviewConfiguration] =
    useState<DateFormConfiguration | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fieldCount = steps.reduce((total, step) => total + step.fields.length, 0);

  function markChanged() {
    setPreviewConfiguration(null);
    setErrors([]);
    setNotice("");
  }

  function changeText(setter: (value: string) => void, value: string) {
    markChanged();
    setter(value);
  }

  function mutateSteps(updater: (current: DateFormStep[]) => DateFormStep[]) {
    markChanged();
    setSteps(updater);
  }

  function updateStep(stepIndex: number, patch: Partial<DateFormStep>) {
    mutateSteps((current) =>
      current.map((step, index) => (index === stepIndex ? { ...step, ...patch } : step)),
    );
  }

  function updateField(
    stepIndex: number,
    fieldIndex: number,
    patch: Partial<DateFormField>,
  ) {
    mutateSteps((current) =>
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
    if (steps.length >= MAX_WIZARD_STEPS) {
      setNotice(`The ${MAX_WIZARD_STEPS}-step limit has been reached.`);
      return;
    }
    if (fieldCount >= MAX_FORM_ELEMENTS) {
      setNotice(`The ${MAX_FORM_ELEMENTS}-element limit has been reached.`);
      return;
    }
    mutateSteps((current) => [...current, newStep(current.length + 1)]);
  }

  function removeStep(stepIndex: number) {
    if (steps.length === 1) return;
    mutateSteps((current) => current.filter((_, index) => index !== stepIndex));
  }

  function moveStep(stepIndex: number, direction: -1 | 1) {
    const destination = stepIndex + direction;
    if (destination < 0 || destination >= steps.length) return;
    mutateSteps((current) => {
      const next = [...current];
      [next[stepIndex], next[destination]] = [next[destination], next[stepIndex]];
      return next;
    });
  }

  function addField(stepIndex: number) {
    if (fieldCount >= MAX_FORM_ELEMENTS) {
      setNotice(`The ${MAX_FORM_ELEMENTS}-element limit has been reached.`);
      return;
    }
    mutateSteps((current) =>
      current.map((step, index) =>
        index === stepIndex ? { ...step, fields: [...step.fields, newField()] } : step,
      ),
    );
  }

  function removeField(stepIndex: number, fieldIndex: number) {
    if (steps[stepIndex].fields.length === 1) {
      setNotice("Each wizard step must keep at least one form element.");
      return;
    }
    mutateSteps((current) =>
      current.map((step, index) =>
        index === stepIndex
          ? {
              ...step,
              fields: step.fields.filter((_, currentIndex) => currentIndex !== fieldIndex),
            }
          : step,
      ),
    );
  }

  function moveField(stepIndex: number, fieldIndex: number, direction: -1 | 1) {
    const destination = fieldIndex + direction;
    if (destination < 0 || destination >= steps[stepIndex].fields.length) return;
    mutateSteps((current) =>
      current.map((step, index) => {
        if (index !== stepIndex) return step;
        const fields = [...step.fields];
        [fields[fieldIndex], fields[destination]] = [fields[destination], fields[fieldIndex]];
        return { ...step, fields };
      }),
    );
  }

  function assignField(stepIndex: number, fieldIndex: number, destinationIndex: number) {
    if (destinationIndex === stepIndex) return;
    if (steps[stepIndex].fields.length === 1) {
      setNotice("A step must keep at least one element. Add another element before moving this one.");
      return;
    }
    mutateSteps((current) => {
      const next = current.map((step) => ({ ...step, fields: [...step.fields] }));
      const [field] = next[stepIndex].fields.splice(fieldIndex, 1);
      next[destinationIndex].fields.push(field);
      return next;
    });
  }

  function buildConfiguration(): DateFormConfiguration {
    return {
      version: DATE_FORM_SCHEMA_VERSION,
      title,
      invitationQuestion,
      successMessage,
      ...(displayDate.trim() ? { displayDate: displayDate.trim() } : {}),
      email: { sender, recipient },
      steps,
    };
  }

  function openPreview() {
    const validation = validateDateFormConfiguration(buildConfiguration());
    if (!validation.ok) {
      setErrors(validation.errors);
      document.getElementById("builder-errors")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setErrors([]);
    setPreviewConfiguration(validation.value);
    setMode("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveForm() {
    if (!previewConfiguration) {
      setMode("edit");
      setErrors(["Preview the valid form before finalizing it."]);
      return;
    }

    setErrors([]);
    setIsSaving(true);
    try {
      const response = await fetch("/api/date-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(previewConfiguration),
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
      setErrors([caught instanceof Error ? caught.message : "Unable to save form."]);
    } finally {
      setIsSaving(false);
    }
  }

  if (mode === "preview" && previewConfiguration) {
    return (
      <FormPreview
        configuration={previewConfiguration}
        isSaving={isSaving}
        errors={errors}
        onBack={() => setMode("edit")}
        onFinalize={saveForm}
      />
    );
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
          Create up to {MAX_WIZARD_STEPS} steps with {MAX_FORM_ELEMENTS} total elements, then preview the complete form before publishing.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <TextInput label="Form title" value={title} onChange={(value) => changeText(setTitle, value)} />
          <TextInput label="Display date (optional)" value={displayDate} onChange={(value) => changeText(setDisplayDate, value)} />
          <TextInput label="Invitation question" value={invitationQuestion} onChange={(value) => changeText(setInvitationQuestion, value)} />
          <TextInput label="Success message" value={successMessage} onChange={(value) => changeText(setSuccessMessage, value)} />
        </div>

        <fieldset className="mt-8 rounded-[8px] border border-[var(--soft-gray)] p-5">
          <legend className="px-2 text-lg font-black text-[var(--ink)]">Email delivery</legend>
          <p className="mb-4 text-sm text-[var(--ink)]">
            Email configuration contains only sender and recipient.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput label="Sender email" type="email" value={sender} onChange={(value) => changeText(setSender, value)} />
            <TextInput label="Recipient email" type="email" value={recipient} onChange={(value) => changeText(setRecipient, value)} />
          </div>
        </fieldset>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-[var(--ink)]">Wizard steps</h2>
            <p className="text-sm text-[var(--ink)]" aria-live="polite">
              {steps.length}/{MAX_WIZARD_STEPS} steps · {fieldCount}/{MAX_FORM_ELEMENTS} elements
            </p>
          </div>
          <button
            className="h-11 rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--icy-blue)] px-4 font-bold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={addStep}
            disabled={steps.length >= MAX_WIZARD_STEPS || fieldCount >= MAX_FORM_ELEMENTS}
            aria-describedby="builder-limit-notice"
          >
            + Step
          </button>
        </div>

        <p id="builder-limit-notice" className="mt-2 text-sm font-semibold text-[var(--ink)]" aria-live="polite">
          {notice || (fieldCount >= MAX_FORM_ELEMENTS
            ? `Maximum of ${MAX_FORM_ELEMENTS} elements reached.`
            : steps.length >= MAX_WIZARD_STEPS
              ? `Maximum of ${MAX_WIZARD_STEPS} steps reached.`
              : "You can reorder steps and move elements between them.")}
        </p>

        <div className="mt-5 grid gap-6">
          {steps.map((step, stepIndex) => (
            <section key={step.id} className="rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--pastel-petal)]/35 p-4 sm:p-6">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-56 flex-1">
                  <TextInput label={`Step ${stepIndex + 1} title`} value={step.title} onChange={(value) => updateStep(stepIndex, { title: value })} />
                </div>
                <StepActions
                  index={stepIndex}
                  count={steps.length}
                  onMove={moveStep}
                  onRemove={removeStep}
                />
              </div>
              <div className="mt-4">
                <TextInput label="Step description (optional)" value={step.description ?? ""} onChange={(value) => updateStep(stepIndex, { description: value })} />
              </div>

              <div className="mt-5 grid gap-4">
                {step.fields.map((field, fieldIndex) => (
                  <fieldset key={field.id} className="rounded-[8px] border border-[var(--soft-gray)] bg-white p-4">
                    <legend className="px-2 text-sm font-black text-[var(--ink)]">Element {fieldIndex + 1}</legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextInput label="Label" value={field.label} onChange={(value) => updateField(stepIndex, fieldIndex, { label: value })} />
                      <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
                        Element type
                        <select className="h-11 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 text-base" value={field.type} onChange={(event) => updateField(stepIndex, fieldIndex, {
                          type: event.target.value as FormFieldType,
                          options: event.target.value === "select" || event.target.value === "radio" ? field.options ?? ["Option 1", "Option 2"] : undefined,
                        })}>
                          {FIELD_TYPES.map((type) => <option key={type} value={type}>{fieldTypeLabels[type]}</option>)}
                        </select>
                      </label>
                      {field.type !== "radio" && field.type !== "select" ? (
                        <TextInput label="Placeholder (optional)" value={field.placeholder ?? ""} onChange={(value) => updateField(stepIndex, fieldIndex, { placeholder: value })} />
                      ) : null}
                      {steps.length > 1 ? (
                        <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
                          Assign to step
                          <select className="h-11 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 text-base" value={stepIndex} onChange={(event) => assignField(stepIndex, fieldIndex, Number(event.target.value))}>
                            {steps.map((candidate, candidateIndex) => <option key={candidate.id} value={candidateIndex}>{candidateIndex + 1}. {candidate.title}</option>)}
                          </select>
                        </label>
                      ) : null}
                    </div>

                    {(field.type === "select" || field.type === "radio") ? (
                      <label className="mt-4 grid gap-2 text-sm font-semibold text-[var(--ink)]">
                        Options (one per line, maximum {MAX_OPTIONS_PER_FIELD})
                        <textarea className="min-h-28 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 py-2 text-base" value={(field.options ?? []).join("\n")} onChange={(event) => updateField(stepIndex, fieldIndex, { options: event.target.value.split("\n") })} />
                      </label>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <label className="mr-auto flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                        <input type="checkbox" checked={field.required} onChange={(event) => updateField(stepIndex, fieldIndex, { required: event.target.checked })} />
                        Required
                      </label>
                      <SmallButton disabled={fieldIndex === 0} onClick={() => moveField(stepIndex, fieldIndex, -1)}>Move up</SmallButton>
                      <SmallButton disabled={fieldIndex === step.fields.length - 1} onClick={() => moveField(stepIndex, fieldIndex, 1)}>Move down</SmallButton>
                      <SmallButton disabled={step.fields.length === 1} onClick={() => removeField(stepIndex, fieldIndex)}>Remove</SmallButton>
                    </div>
                  </fieldset>
                ))}
              </div>

              <button className="mt-4 h-11 rounded-[8px] border-2 border-[var(--soft-gray)] bg-white px-4 font-bold text-[var(--ink)] disabled:opacity-40" type="button" onClick={() => addField(stepIndex)} disabled={fieldCount >= MAX_FORM_ELEMENTS}>
                + Element
              </button>
            </section>
          ))}
        </div>

        {errors.length > 0 ? <ErrorList errors={errors} /> : null}

        <button className="mt-8 h-14 w-full rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--baby-pink)] px-5 text-lg font-black text-[var(--ink)] outline outline-2 outline-[var(--soft-gray)]" type="button" onClick={openPreview}>
          Preview form
        </button>
      </section>
    </main>
  );
}

function FormPreview({ configuration, isSaving, errors, onBack, onFinalize }: {
  configuration: DateFormConfiguration;
  isSaving: boolean;
  errors: string[];
  onBack: () => void;
  onFinalize: () => void;
}) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-[8px] border-2 border-[var(--soft-gray)] bg-white/90 p-5 shadow-xl shadow-[var(--thistle)] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)]">Preview before finalization</p>
        <h1 className="mt-3 text-4xl font-black text-[var(--ink)]">{configuration.invitationQuestion}</h1>
        {configuration.displayDate ? <p className="mt-2 font-semibold text-[var(--ink)]">{configuration.displayDate}</p> : null}
        <p className="mt-4 text-sm text-[var(--ink)]">Form title: {configuration.title}</p>

        <div className="mt-7 grid gap-5">
          {configuration.steps.map((step, index) => (
            <section key={step.id} className="rounded-[8px] border border-[var(--soft-gray)] bg-[var(--pastel-petal)]/25 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink)]">Step {index + 1} of {configuration.steps.length}</p>
              <h2 className="mt-2 text-2xl font-black text-[var(--ink)]">{step.title}</h2>
              {step.description ? <p className="mt-1 text-[var(--ink)]">{step.description}</p> : null}
              <div className="mt-4 grid gap-3">
                {step.fields.map((field) => <PreviewField key={field.id} field={field} />)}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6 rounded-[8px] border border-[var(--soft-gray)] p-4 text-sm text-[var(--ink)]">
          <p><strong>Sender:</strong> {configuration.email.sender}</p>
          <p className="mt-1"><strong>Recipient:</strong> {configuration.email.recipient}</p>
          <p className="mt-1"><strong>Success message:</strong> {configuration.successMessage}</p>
        </div>

        {errors.length > 0 ? <ErrorList errors={errors} /> : null}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button className="h-12 flex-1 rounded-[8px] border-2 border-[var(--soft-gray)] bg-white px-4 font-bold text-[var(--ink)]" type="button" onClick={onBack} disabled={isSaving}>Back to editor</button>
          <button className="h-12 flex-1 rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--baby-pink)] px-4 font-black text-[var(--ink)] disabled:opacity-50" type="button" onClick={onFinalize} disabled={isSaving}>{isSaving ? "Creating link..." : "Finalize and create link"}</button>
        </div>
      </section>
    </main>
  );
}

function StepActions({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (index: number, direction: -1 | 1) => void; onRemove: (index: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <SmallButton disabled={index === 0} onClick={() => onMove(index, -1)}>Move up</SmallButton>
      <SmallButton disabled={index === count - 1} onClick={() => onMove(index, 1)}>Move down</SmallButton>
      <SmallButton disabled={count === 1} onClick={() => onRemove(index)}>Remove step</SmallButton>
    </div>
  );
}

function SmallButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button type="button" className="h-10 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 text-sm font-bold text-[var(--ink)] disabled:opacity-40" disabled={disabled} onClick={onClick}>{children}</button>;
}

function ErrorList({ errors }: { errors: string[] }) {
  return (
    <div id="builder-errors" role="alert" className="mt-6 rounded-[8px] bg-[var(--baby-pink)] px-4 py-3 text-sm font-semibold text-[var(--ink)]">
      <p>Fix the following before continuing:</p>
      <ul className="mt-2 list-disc pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul>
    </div>
  );
}

function PreviewField({ field }: { field: DateFormField }) {
  const controlClass =
    "mt-2 min-h-11 w-full rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 py-2 text-base disabled:opacity-80";
  const label = <span className="font-bold">{field.label}{field.required ? " *" : ""}</span>;

  if (field.type === "textarea") {
    return <label className="block text-sm text-[var(--ink)]">{label}<textarea className={`${controlClass} min-h-24`} placeholder={field.placeholder} disabled /></label>;
  }
  if (field.type === "select") {
    return <label className="block text-sm text-[var(--ink)]">{label}<select className={controlClass} disabled defaultValue=""><option value="">Choose one</option>{(field.options ?? []).map((option) => <option key={option}>{option}</option>)}</select></label>;
  }
  if (field.type === "radio") {
    return <fieldset className="rounded-[8px] bg-white p-3 text-sm text-[var(--ink)]"><legend>{label}</legend><div className="mt-2 flex flex-wrap gap-3">{(field.options ?? []).map((option) => <label key={option} className="flex items-center gap-2"><input type="radio" name={`preview-${field.id}`} disabled />{option}</label>)}</div></fieldset>;
  }
  return <label className="block text-sm text-[var(--ink)]">{label}<input className={controlClass} type={field.type === "date" ? "date" : "text"} placeholder={field.placeholder} disabled /></label>;
}

function TextInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: "text" | "email" }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
      {label}
      <input className="h-11 min-w-0 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 text-base font-normal" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
