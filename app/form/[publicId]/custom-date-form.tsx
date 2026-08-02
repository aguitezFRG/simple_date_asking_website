"use client";

import { FormEvent, useState } from "react";
import type { DateFormConfiguration, DateFormField } from "../../../lib/date-forms/schema";

type Stage = "invite" | "wizard" | "success";

type Props = {
  publicId: string;
  configuration: DateFormConfiguration;
  showShareNotice: boolean;
};

export default function CustomDateForm({ publicId, configuration, showShareNotice }: Props) {
  const [stage, setStage] = useState<Stage>("invite");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const sharePath = `/form/${publicId}`;

  const step = configuration.steps[stepIndex];

  function setAnswer(fieldId: string, value: string) {
    setAnswers((current) => ({ ...current, [fieldId]: value }));
  }

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);
      setCopyNotice("Link copied.");
    } catch {
      setCopyNotice("Copy the link shown above.");
    }
  }

  function validateStep() {
    const missing = step.fields.find(
      (field) => field.required && !(answers[field.id] ?? "").trim(),
    );
    if (missing) {
      setError(`Please complete “${missing.label}”.`);
      return false;
    }
    setError("");
    return true;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateStep()) return;

    if (stepIndex < configuration.steps.length - 1) {
      setStepIndex((index) => index + 1);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/date-forms/${encodeURIComponent(publicId)}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-date-form-id": publicId,
        },
        body: JSON.stringify({ answers }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(result.error || "Unable to send your response.");
      setStage("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send your response.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (stage === "success") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-center">
        <h1 className="max-w-3xl text-5xl font-black leading-tight text-[var(--ink)] sm:text-7xl">
          {configuration.successMessage}
        </h1>
      </main>
    );
  }

  if (stage === "invite") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 py-10 text-center">
        <section className="w-full max-w-4xl">
          {showShareNotice ? (
            <div className="mx-auto mb-8 max-w-2xl rounded-[8px] border-2 border-[var(--soft-gray)] bg-white/90 p-4 text-left text-sm text-[var(--ink)] shadow-lg">
              <p className="font-black">Your form is ready.</p>
              <p className="mt-1 break-all">Share this URL: {sharePath}</p>
              <button
                type="button"
                className="mt-3 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 py-2 font-bold"
                onClick={copyShareUrl}
              >
                Copy full link
              </button>
              <span className="ml-3" aria-live="polite">{copyNotice}</span>
            </div>
          ) : null}
          {configuration.displayDate ? (
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ink)]">
              {configuration.displayDate}
            </p>
          ) : null}
          <h1 className="mx-auto max-w-3xl text-5xl font-black leading-tight text-[var(--ink)] sm:text-7xl">
            {configuration.invitationQuestion}
          </h1>
          <button
            className="mt-12 h-14 rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--baby-pink)] px-9 text-lg font-black text-[var(--ink)] outline outline-2 outline-[var(--soft-gray)]"
            type="button"
            onClick={() => setStage("wizard")}
          >
            Yes
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl items-center px-4 py-8 sm:px-6">
      <form
        className="w-full rounded-[8px] border-2 border-[var(--soft-gray)] bg-white/90 p-5 shadow-xl shadow-[var(--thistle)] sm:p-8"
        onSubmit={submit}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)]">
          Step {stepIndex + 1} of {configuration.steps.length}
        </p>
        <h1 className="mt-3 text-3xl font-black text-[var(--ink)] sm:text-4xl">{step.title}</h1>
        {step.description ? <p className="mt-2 text-[var(--ink)]">{step.description}</p> : null}

        <div className="mt-7 grid gap-5">
          {step.fields.map((field) => (
            <Field
              key={field.id}
              field={field}
              value={answers[field.id] ?? ""}
              onChange={(value) => setAnswer(field.id, value)}
            />
          ))}
        </div>

        {error ? (
          <p role="alert" className="mt-5 rounded-[8px] bg-[var(--baby-pink)] px-4 py-3 text-sm font-semibold text-[var(--ink)]">
            {error}
          </p>
        ) : null}

        <div className="mt-7 flex gap-3">
          {stepIndex > 0 ? (
            <button
              className="h-12 flex-1 rounded-[8px] border-2 border-[var(--soft-gray)] bg-white px-4 font-bold text-[var(--ink)]"
              type="button"
              onClick={() => setStepIndex((index) => index - 1)}
            >
              Back
            </button>
          ) : null}
          <button
            className="h-12 flex-1 rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--baby-pink)] px-4 font-black text-[var(--ink)] disabled:opacity-50"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Sending..."
              : stepIndex === configuration.steps.length - 1
                ? "Send response"
                : "Continue"}
          </button>
        </div>
      </form>
    </main>
  );
}

function Field({
  field,
  value,
  onChange,
}: {
  field: DateFormField;
  value: string;
  onChange: (value: string) => void;
}) {
  const commonClass =
    "min-h-12 rounded-[8px] border border-[var(--soft-gray)] bg-white px-4 py-3 text-base font-normal";

  if (field.type === "textarea") {
    return (
      <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
        {field.label}
        <textarea
          className={`${commonClass} min-h-32`}
          required={field.required}
          placeholder={field.placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
        {field.label}
        <select
          className={commonClass}
          required={field.required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="" disabled>
            Choose one
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "radio") {
    return (
      <fieldset className="grid gap-3">
        <legend className="text-sm font-semibold text-[var(--ink)]">{field.label}</legend>
        {(field.options ?? []).map((option) => (
          <label key={option} className="flex items-center gap-3 rounded-[8px] border border-[var(--soft-gray)] bg-white px-4 py-3 text-[var(--ink)]">
            <input
              type="radio"
              name={field.id}
              required={field.required}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {option}
          </label>
        ))}
      </fieldset>
    );
  }

  return (
    <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
      {field.label}
      <input
        className={commonClass}
        type={field.type === "date" ? "date" : "text"}
        required={field.required}
        placeholder={field.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
