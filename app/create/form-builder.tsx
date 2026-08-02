"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DATE_FORM_SCHEMA_VERSION,
  FIELD_TYPES,
  MAX_FORM_ELEMENTS,
  MAX_OPTIONS_PER_FIELD,
  MAX_WIZARD_STEPS,
  SYSTEM_RESPONDENT_EMAIL_FIELD,
  validateDateFormConfiguration,
  type DateFormConfiguration,
  type DateFormField,
  type DateFormStep,
  type FormFieldType,
} from "../../lib/date-forms/schema";
import { BUILDER_DRAFT_STORAGE_KEY } from "../../lib/date-forms/builder-draft";

type EditorMode = "edit" | "preview" | "success";
type AuthStatus = "checking" | "signed_out" | "unverified" | "sent" | "verified" | "expired" | "unavailable";
type CreatedForm = { url: string; expiresAt: string };

const fieldTypeLabels: Record<FormFieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  select: "Dropdown",
  radio: "Multiple choice",
  date: "Date",
};

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
  return { id: makeId("step"), title: `Step ${index}`, fields: [newField()] };
}

function defaultConfiguration(): DateFormConfiguration {
  return {
    version: DATE_FORM_SCHEMA_VERSION,
    title: "Our date invitation",
    invitationQuestion: "Would you like to be my date?",
    successMessage: "See you there!",
    steps: [{ id: "step_1", title: "Step 1", fields: [newField("field_1")] }],
  };
}

function cloneConfiguration(configuration: DateFormConfiguration): DateFormConfiguration {
  return {
    ...configuration,
    steps: configuration.steps.map((step) => ({
      ...step,
      fields: step.fields.map((field) => ({
        ...field,
        ...(field.options ? { options: [...field.options] } : {}),
      })),
    })),
  };
}

export default function FormBuilder({
  initialConfiguration,
  initialAuthMessage,
}: {
  initialConfiguration?: DateFormConfiguration;
  initialAuthMessage?: "verified" | "expired";
}) {
  const router = useRouter();
  const initialDraft = useMemo(
    () => cloneConfiguration(initialConfiguration ?? defaultConfiguration()),
    [initialConfiguration],
  );
  const [configuration, setConfiguration] = useState(initialDraft);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialDraft));
  const [mode, setMode] = useState<EditorMode>("edit");
  const [previewConfiguration, setPreviewConfiguration] =
    useState<DateFormConfiguration | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [createdForm, setCreatedForm] = useState<CreatedForm | null>(null);
  const [copyNotice, setCopyNotice] = useState("");
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    initialAuthMessage === "expired" ? "expired" : "checking",
  );
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [authNotice, setAuthNotice] = useState(
    initialAuthMessage === "expired" ? "Verification link expired. Request a new email." : "",
  );
  const [cooldown, setCooldown] = useState(0);
  const fieldCount = configuration.steps.reduce(
    (total, step) => total + step.fields.length,
    0,
  );
  const dirty = JSON.stringify(configuration) !== baseline;

  const refreshAuthStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/creator-auth", { cache: "no-store" });
      const result = (await response.json()) as { status?: AuthStatus; email?: string | null };
      if (!response.ok || !result.status) throw new Error();
      setAuthStatus(result.status);
      if (result.status === "verified" && result.email) {
        setVerifiedEmail(result.email);
        setVerificationEmail(result.email);
        setAuthNotice("Email verified. You can publish this form.");
      } else if (result.status === "signed_out" && initialAuthMessage !== "expired") {
        setAuthNotice("Email not provided.");
      }
    } catch {
      setAuthStatus("unavailable");
      setAuthNotice("Email verification is temporarily unavailable.");
    }
  }, [initialAuthMessage]);

  useEffect(() => {
    if (initialConfiguration) return;
    const stored = sessionStorage.getItem(BUILDER_DRAFT_STORAGE_KEY);
    if (!stored) return;
    try {
      const validation = validateDateFormConfiguration(JSON.parse(stored));
      if (!validation.ok) return;
      const timer = window.setTimeout(() => setConfiguration(validation.value), 0);
      return () => window.clearTimeout(timer);
    } catch {
      sessionStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY);
    }
  }, [initialConfiguration]);

  useEffect(() => {
    if (mode === "success") return;
    if (dirty) sessionStorage.setItem(BUILDER_DRAFT_STORAGE_KEY, JSON.stringify(configuration));
    else sessionStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY);
  }, [configuration, dirty, mode]);

  useEffect(() => {
    if (!dirty || mode === "success") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, mode]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshAuthStatus(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshAuthStatus]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function requestVerification() {
    if (cooldown > 0 || authStatus === "checking") return;
    setAuthStatus("checking");
    setAuthNotice("");
    try {
      const response = await fetch("/api/creator-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Unable to send verification email.");
      setAuthStatus("sent");
      setCooldown(60);
      setAuthNotice(result.message || "Verification email sent.");
    } catch (error) {
      setAuthStatus("unverified");
      setAuthNotice(error instanceof Error ? error.message : "Unable to send verification email.");
    }
  }

  function markChanged(next: DateFormConfiguration) {
    setConfiguration(next);
    setPreviewConfiguration(null);
    setErrors([]);
    setNotice("");
  }

  function updateConfiguration(patch: Partial<DateFormConfiguration>) {
    markChanged({ ...configuration, ...patch });
  }

  function mutateSteps(updater: (steps: DateFormStep[]) => DateFormStep[]) {
    markChanged({ ...configuration, steps: updater(configuration.steps) });
  }

  function updateStep(stepIndex: number, patch: Partial<DateFormStep>) {
    mutateSteps((steps) =>
      steps.map((step, index) => (index === stepIndex ? { ...step, ...patch } : step)),
    );
  }

  function updateField(stepIndex: number, fieldIndex: number, patch: Partial<DateFormField>) {
    mutateSteps((steps) =>
      steps.map((step, currentStepIndex) =>
        currentStepIndex === stepIndex
          ? {
              ...step,
              fields: step.fields.map((field, currentFieldIndex) =>
                currentFieldIndex === fieldIndex ? { ...field, ...patch } : field,
              ),
            }
          : step,
      ),
    );
  }

  function addStep() {
    if (configuration.steps.length >= MAX_WIZARD_STEPS) {
      setNotice(`A form can contain a maximum of ${MAX_WIZARD_STEPS} steps.`);
      return;
    }
    if (fieldCount >= MAX_FORM_ELEMENTS) {
      setNotice(`The ${MAX_FORM_ELEMENTS}-element limit has been reached.`);
      return;
    }
    mutateSteps((steps) => [...steps, newStep(steps.length + 1)]);
  }

  function removeStep(stepIndex: number) {
    if (configuration.steps.length === 1) return;
    mutateSteps((steps) => steps.filter((_, index) => index !== stepIndex));
  }

  function moveStep(stepIndex: number, direction: -1 | 1) {
    const destination = stepIndex + direction;
    if (destination < 0 || destination >= configuration.steps.length) return;
    mutateSteps((steps) => {
      const next = [...steps];
      [next[stepIndex], next[destination]] = [next[destination], next[stepIndex]];
      return next;
    });
  }

  function addField(stepIndex: number) {
    if (fieldCount >= MAX_FORM_ELEMENTS) {
      setNotice(`The ${MAX_FORM_ELEMENTS}-element limit has been reached.`);
      return;
    }
    mutateSteps((steps) =>
      steps.map((step, index) =>
        index === stepIndex ? { ...step, fields: [...step.fields, newField()] } : step,
      ),
    );
  }

  function removeField(stepIndex: number, fieldIndex: number) {
    if (configuration.steps[stepIndex].fields.length === 1) {
      setNotice("Each wizard step must keep at least one form element.");
      return;
    }
    mutateSteps((steps) =>
      steps.map((step, index) =>
        index === stepIndex
          ? { ...step, fields: step.fields.filter((_, current) => current !== fieldIndex) }
          : step,
      ),
    );
  }

  function moveField(stepIndex: number, fieldIndex: number, direction: -1 | 1) {
    const destination = fieldIndex + direction;
    if (destination < 0 || destination >= configuration.steps[stepIndex].fields.length) return;
    mutateSteps((steps) =>
      steps.map((step, index) => {
        if (index !== stepIndex) return step;
        const fields = [...step.fields];
        [fields[fieldIndex], fields[destination]] = [fields[destination], fields[fieldIndex]];
        return { ...step, fields };
      }),
    );
  }

  function assignField(stepIndex: number, fieldIndex: number, destinationIndex: number) {
    if (destinationIndex === stepIndex) return;
    if (configuration.steps[stepIndex].fields.length === 1) {
      setNotice("A step must keep at least one element. Add another element before moving this one.");
      return;
    }
    mutateSteps((steps) => {
      const next = steps.map((step) => ({ ...step, fields: [...step.fields] }));
      const [field] = next[stepIndex].fields.splice(fieldIndex, 1);
      next[destinationIndex].fields.push(field);
      return next;
    });
  }

  function openPreview() {
    const validation = validateDateFormConfiguration(configuration);
    if (!validation.ok) {
      setErrors(validation.errors);
      document.getElementById("builder-errors")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setPreviewConfiguration(validation.value);
    setErrors([]);
    setMode("preview");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goHome() {
    if (dirty && mode !== "success" && !window.confirm("Leave the builder and discard your unsaved changes?")) {
      return;
    }
    sessionStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY);
    router.push("/");
  }

  async function saveForm() {
    if (!previewConfiguration) {
      setMode("edit");
      setErrors(["Preview the valid form before finalizing it."]);
      return;
    }
    if (authStatus !== "verified") {
      setErrors(["Verify your email before publishing."]);
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
      const result = (await response.json()) as { error?: string; details?: string[]; url?: string; expiresAt?: string };
      if (!response.ok || !result.url || !result.expiresAt) {
        if (response.status === 401) setAuthStatus("signed_out");
        throw new Error(result.details?.join(" ") || result.error || "Unable to save form.");
      }
      const fullUrl = new URL(result.url, window.location.origin).toString();
      setCreatedForm({ url: fullUrl, expiresAt: result.expiresAt });
      setBaseline(JSON.stringify(previewConfiguration));
      sessionStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY);
      setMode("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Unable to save form."]);
    } finally {
      setIsSaving(false);
    }
  }

  async function copyCreatedUrl() {
    if (!createdForm) return;
    try {
      await navigator.clipboard.writeText(createdForm.url);
      setCopyNotice("Link copied.");
    } catch {
      setCopyNotice("Copy failed. Select and copy the URL above.");
    }
  }

  if (mode === "success" && createdForm) {
    const expiration = new Intl.DateTimeFormat(undefined, {
      dateStyle: "full",
      timeStyle: "long",
    }).format(new Date(createdForm.expiresAt));
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-3xl items-center px-4 py-8 sm:px-6">
        <section className="w-full rounded-[8px] border-2 border-[var(--soft-gray)] bg-white/90 p-5 shadow-xl shadow-[var(--thistle)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)]">Form created</p>
          <h1 className="mt-3 text-4xl font-black text-[var(--ink)]">Save your generated URL</h1>
          <p className="mt-5 break-all rounded-[8px] border border-[var(--soft-gray)] bg-white p-4 font-semibold text-[var(--ink)]">{createdForm.url}</p>
          <button type="button" className="mt-3 h-12 rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--baby-pink)] px-5 font-black text-[var(--ink)]" onClick={copyCreatedUrl}>Copy URL</button>
          <span className="ml-3 text-sm font-semibold text-[var(--ink)]" aria-live="polite">{copyNotice}</span>
          <p className="mt-6 font-bold text-[var(--ink)]">This form expires three days after creation.</p>
          <p className="mt-2 text-[var(--ink)]">Exact expiration: {expiration}</p>
          <p className="mt-4 rounded-[8px] bg-[var(--pastel-petal)] p-4 font-black text-[var(--ink)]">Save the generated URL. The app cannot recover the form if the link is lost.</p>
          <button type="button" className="mt-6 h-12 rounded-[8px] border-2 border-[var(--soft-gray)] bg-white px-5 font-bold text-[var(--ink)]" onClick={goHome}>Back to Home</button>
        </section>
      </main>
    );
  }

  if (mode === "preview" && previewConfiguration) {
    return (
      <FormPreview
        configuration={previewConfiguration}
        authStatus={authStatus}
        verifiedEmail={verifiedEmail}
        isSaving={isSaving}
        errors={errors}
        onBack={() => setMode("edit")}
        onFinalize={saveForm}
        onHome={goHome}
      />
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-[8px] border-2 border-[var(--soft-gray)] bg-white/90 p-5 shadow-xl shadow-[var(--thistle)] sm:p-8">
        <button type="button" className="mb-5 rounded-[8px] border border-[var(--soft-gray)] bg-white px-4 py-2 font-bold text-[var(--ink)]" onClick={goHome}>Back to Home</button>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)]">Custom date form</p>
        <h1 className="mt-3 text-3xl font-black text-[var(--ink)] sm:text-5xl">Build your invitation</h1>
        <p className="mt-3 text-[var(--ink)]">Create up to {MAX_WIZARD_STEPS} steps with {MAX_FORM_ELEMENTS} configurable elements, then preview before publishing.</p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <TextInput label="Form title" value={configuration.title} onChange={(title) => updateConfiguration({ title })} />
          <TextInput label="Display date (optional)" value={configuration.displayDate ?? ""} onChange={(displayDate) => updateConfiguration({ displayDate })} />
          <TextInput label="Invitation question" value={configuration.invitationQuestion} onChange={(invitationQuestion) => updateConfiguration({ invitationQuestion })} />
          <TextInput label="Success message" value={configuration.successMessage} onChange={(successMessage) => updateConfiguration({ successMessage })} />
        </div>

        <SystemEmailCard />
        <CreatorVerification
          status={authStatus}
          email={verificationEmail}
          verifiedEmail={verifiedEmail}
          notice={authNotice}
          cooldown={cooldown}
          onEmailChange={setVerificationEmail}
          onRequest={requestVerification}
          onRefresh={refreshAuthStatus}
        />

        <div className="mt-8">
          <h2 className="text-2xl font-black text-[var(--ink)]">Wizard steps</h2>
          <p className="text-sm text-[var(--ink)]" aria-live="polite">{configuration.steps.length}/{MAX_WIZARD_STEPS} steps · {fieldCount}/{MAX_FORM_ELEMENTS} configurable elements</p>
        </div>

        <p id="builder-limit-notice" className="mt-2 text-sm font-semibold text-[var(--ink)]" aria-live="polite">
          {notice || (fieldCount >= MAX_FORM_ELEMENTS
            ? `Maximum of ${MAX_FORM_ELEMENTS} configurable elements reached.`
            : configuration.steps.length >= MAX_WIZARD_STEPS
              ? `A form can contain a maximum of ${MAX_WIZARD_STEPS} steps.`
              : "You can reorder steps and move elements between them.")}
        </p>

        <div className="mt-5 grid gap-6">
          {configuration.steps.map((step, stepIndex) => (
            <section key={step.id} aria-label={`Step ${stepIndex + 1} editor`} className="rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--pastel-petal)]/35 p-4 sm:p-6">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-56 flex-1"><TextInput label={`Step ${stepIndex + 1} title`} value={step.title} onChange={(title) => updateStep(stepIndex, { title })} /></div>
                <StepActions index={stepIndex} count={configuration.steps.length} onMove={moveStep} onRemove={removeStep} />
              </div>
              <div className="mt-4"><TextInput label="Step description (optional)" value={step.description ?? ""} onChange={(description) => updateStep(stepIndex, { description })} /></div>
              <div className="mt-5 grid gap-4">
                {step.fields.map((field, fieldIndex) => (
                  <fieldset key={field.id} className="rounded-[8px] border border-[var(--soft-gray)] bg-white p-4">
                    <legend className="px-2 text-sm font-black text-[var(--ink)]">Element {fieldIndex + 1}</legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <TextInput label="Label" value={field.label} onChange={(label) => updateField(stepIndex, fieldIndex, { label })} />
                      <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">Element type<select className="h-11 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 text-base" value={field.type} onChange={(event) => updateField(stepIndex, fieldIndex, { type: event.target.value as FormFieldType, options: event.target.value === "select" || event.target.value === "radio" ? field.options ?? ["Option 1", "Option 2"] : undefined, allowOther: event.target.value === "select" || event.target.value === "radio" ? field.allowOther : undefined })}>{FIELD_TYPES.map((type) => <option key={type} value={type}>{fieldTypeLabels[type]}</option>)}</select></label>
                      {field.type !== "radio" && field.type !== "select" ? <TextInput label="Placeholder (optional)" value={field.placeholder ?? ""} onChange={(placeholder) => updateField(stepIndex, fieldIndex, { placeholder })} /> : null}
                      {configuration.steps.length > 1 ? <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">Assign to step<select className="h-11 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 text-base" value={stepIndex} onChange={(event) => assignField(stepIndex, fieldIndex, Number(event.target.value))}>{configuration.steps.map((candidate, candidateIndex) => <option key={candidate.id} value={candidateIndex}>{candidateIndex + 1}. {candidate.title}</option>)}</select></label> : null}
                    </div>
                    {field.type === "select" || field.type === "radio" ? <><label className="mt-4 grid gap-2 text-sm font-semibold text-[var(--ink)]">Options (one per line, maximum {MAX_OPTIONS_PER_FIELD})<textarea className="min-h-28 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 py-2 text-base" value={(field.options ?? []).join("\n")} onChange={(event) => updateField(stepIndex, fieldIndex, { options: event.target.value.split("\n") })} /></label><label className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]"><input type="checkbox" checked={field.allowOther === true} onChange={(event) => updateField(stepIndex, fieldIndex, { allowOther: event.target.checked })} />Allow an “Other” answer</label></> : null}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <label className="mr-auto flex items-center gap-2 text-sm font-semibold text-[var(--ink)]"><input type="checkbox" checked={field.required} onChange={(event) => updateField(stepIndex, fieldIndex, { required: event.target.checked })} />Required</label>
                      <SmallButton ariaLabel={`Move element ${fieldIndex + 1} up`} disabled={fieldIndex === 0} onClick={() => moveField(stepIndex, fieldIndex, -1)}>Move up</SmallButton>
                      <SmallButton ariaLabel={`Move element ${fieldIndex + 1} down`} disabled={fieldIndex === step.fields.length - 1} onClick={() => moveField(stepIndex, fieldIndex, 1)}>Move down</SmallButton>
                      <SmallButton ariaLabel={`Remove element ${fieldIndex + 1}`} disabled={step.fields.length === 1} onClick={() => removeField(stepIndex, fieldIndex)}>Remove</SmallButton>
                    </div>
                  </fieldset>
                ))}
              </div>
              <button aria-label={`Add element to step ${stepIndex + 1}`} className="mt-4 h-11 rounded-[8px] border-2 border-[var(--soft-gray)] bg-white px-4 font-bold text-[var(--ink)] disabled:opacity-40" type="button" onClick={() => addField(stepIndex)} disabled={fieldCount >= MAX_FORM_ELEMENTS}>+ Element</button>
            </section>
          ))}
          <button aria-label="Add step after final step" aria-describedby="builder-limit-notice" className="h-11 justify-self-start rounded-[8px] border-2 border-[var(--soft-gray)] bg-white px-4 font-bold text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-50" type="button" onClick={addStep} disabled={configuration.steps.length >= MAX_WIZARD_STEPS || fieldCount >= MAX_FORM_ELEMENTS}>+ Step</button>
        </div>

        <div className="mt-8 rounded-[8px] border border-[var(--soft-gray)] bg-[var(--icy-blue)]/35 p-4 text-[var(--ink)]">
          <p className="font-black">This form expires three days after creation.</p>
          <p className="mt-2 font-semibold">Save the generated URL. The app cannot recover the form if the link is lost.</p>
        </div>
        {errors.length > 0 ? <ErrorList errors={errors} /> : null}
        <button className="mt-8 h-14 w-full rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--baby-pink)] px-5 text-lg font-black text-[var(--ink)] outline outline-2 outline-[var(--soft-gray)]" type="button" onClick={openPreview}>Preview form</button>
      </section>
    </main>
  );
}

function CreatorVerification({ status, email, verifiedEmail, notice, cooldown, onEmailChange, onRequest, onRefresh }: { status: AuthStatus; email: string; verifiedEmail: string; notice: string; cooldown: number; onEmailChange: (value: string) => void; onRequest: () => void; onRefresh: () => void }) {
  return (
    <fieldset className="mt-6 rounded-[8px] border border-[var(--soft-gray)] p-5">
      <legend className="px-2 text-lg font-black text-[var(--ink)]">Creator email verification</legend>
      <p className="mb-4 text-sm text-[var(--ink)]">Verify your email to receive responses submitted through your date form. Once verified, you can reuse the same email for future forms.</p>
      {status === "verified" ? <p className="rounded-[8px] bg-[var(--icy-blue)] p-3 font-black text-[var(--ink)]">Email verified: {verifiedEmail}</p> : <div className="flex flex-col gap-3 sm:flex-row"><TextInput label="Creator email" type="email" value={email} onChange={onEmailChange} /><button type="button" className="h-11 self-end rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--baby-pink)] px-4 font-black text-[var(--ink)] disabled:opacity-50" disabled={status === "checking" || cooldown > 0} onClick={onRequest}>{cooldown > 0 ? `Resend in ${cooldown}s` : status === "sent" ? "Resend verification" : "Send verification email"}</button></div>}
      <div className="mt-3 flex flex-wrap items-center gap-3"><p className="text-sm font-semibold text-[var(--ink)]" aria-live="polite">{notice || (status === "checking" ? "Checking verification status…" : "Email not provided.")}</p>{status !== "verified" ? <button type="button" className="rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 py-2 text-sm font-bold text-[var(--ink)]" onClick={onRefresh}>Check verification status</button> : null}</div>
    </fieldset>
  );
}

function SystemEmailCard() {
  return (
    <section aria-label="System-managed respondent information" className="mt-8 rounded-[8px] border-2 border-dashed border-[var(--soft-gray)] bg-[var(--icy-blue)]/30 p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--ink)]">Locked · system-managed</p>
      <h2 className="mt-2 text-lg font-black text-[var(--ink)]">{SYSTEM_RESPONDENT_EMAIL_FIELD.label} <span aria-label="required">*</span></h2>
      <p className="mt-2 text-sm text-[var(--ink)]">Every date form includes this required email field so the form creator can identify the respondent. It cannot be removed or edited and does not count toward the configurable element limit.</p>
    </section>
  );
}

function FormPreview({ configuration, authStatus, verifiedEmail, isSaving, errors, onBack, onFinalize, onHome }: { configuration: DateFormConfiguration; authStatus: AuthStatus; verifiedEmail: string; isSaving: boolean; errors: string[]; onBack: () => void; onFinalize: () => void; onHome: () => void }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="rounded-[8px] border-2 border-[var(--soft-gray)] bg-white/90 p-5 shadow-xl shadow-[var(--thistle)] sm:p-8">
        <button type="button" className="mb-5 rounded-[8px] border border-[var(--soft-gray)] bg-white px-4 py-2 font-bold text-[var(--ink)]" onClick={onHome}>Back to Home</button>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)]">Preview before finalization</p>
        <h1 className="mt-3 text-4xl font-black text-[var(--ink)]">{configuration.invitationQuestion}</h1>
        {configuration.displayDate ? <p className="mt-2 font-semibold text-[var(--ink)]">{configuration.displayDate}</p> : null}
        <SystemEmailCard />
        <div className="mt-7 grid gap-5">{configuration.steps.map((step, index) => <section key={step.id} className="rounded-[8px] border border-[var(--soft-gray)] bg-[var(--pastel-petal)]/25 p-4"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ink)]">Step {index + 1} of {configuration.steps.length}</p><h2 className="mt-2 text-2xl font-black text-[var(--ink)]">{step.title}</h2>{step.description ? <p className="mt-1 text-[var(--ink)]">{step.description}</p> : null}<div className="mt-4 grid gap-3">{step.fields.map((field) => <PreviewField key={field.id} field={field} />)}</div></section>)}</div>
        <div className="mt-6 rounded-[8px] border border-[var(--soft-gray)] p-4 text-sm text-[var(--ink)]"><p><strong>Creator verification:</strong> {authStatus === "verified" ? `Email verified (${verifiedEmail})` : "Verification required"}</p><p className="mt-2"><strong>This form expires three days after creation.</strong></p><p className="mt-2 font-semibold">Save the generated URL. The app cannot recover the form if the link is lost.</p></div>
        {errors.length > 0 ? <ErrorList errors={errors} /> : null}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row"><button className="h-12 flex-1 rounded-[8px] border-2 border-[var(--soft-gray)] bg-white px-4 font-bold text-[var(--ink)]" type="button" onClick={onBack} disabled={isSaving}>Back to editor</button><button className="h-12 flex-1 rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--baby-pink)] px-4 font-black text-[var(--ink)] disabled:opacity-50" type="button" onClick={onFinalize} disabled={isSaving || authStatus !== "verified"}>{isSaving ? "Creating link..." : "Finalize and create link"}</button></div>
      </section>
    </main>
  );
}

function StepActions({ index, count, onMove, onRemove }: { index: number; count: number; onMove: (index: number, direction: -1 | 1) => void; onRemove: (index: number) => void }) {
  return <div className="flex flex-wrap gap-2"><SmallButton ariaLabel={`Move step ${index + 1} up`} disabled={index === 0} onClick={() => onMove(index, -1)}>Move up</SmallButton><SmallButton ariaLabel={`Move step ${index + 1} down`} disabled={index === count - 1} onClick={() => onMove(index, 1)}>Move down</SmallButton><SmallButton ariaLabel={`Remove step ${index + 1}`} disabled={count === 1} onClick={() => onRemove(index)}>Remove step</SmallButton></div>;
}

function SmallButton({ children, ariaLabel, disabled, onClick }: { children: React.ReactNode; ariaLabel?: string; disabled?: boolean; onClick: () => void }) {
  return <button aria-label={ariaLabel} className="min-h-10 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 text-sm font-bold text-[var(--ink)] disabled:opacity-40" type="button" disabled={disabled} onClick={onClick}>{children}</button>;
}

function ErrorList({ errors }: { errors: string[] }) {
  return <div id="builder-errors" role="alert" className="mt-6 rounded-[8px] bg-[var(--baby-pink)] p-4 text-sm font-semibold text-[var(--ink)]"><p className="font-black">Please fix the following:</p><ul className="mt-2 list-disc space-y-1 pl-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>;
}

function PreviewField({ field }: { field: DateFormField }) {
  const label = <span>{field.label}{field.required ? " *" : ""}</span>;
  const controlClass = "mt-2 h-11 w-full rounded-[8px] border border-[var(--soft-gray)] bg-white px-3";
  if (field.type === "textarea") return <label className="block text-sm text-[var(--ink)]">{label}<textarea className={`${controlClass} min-h-24`} placeholder={field.placeholder} disabled /></label>;
  if (field.type === "select") return <label className="block text-sm text-[var(--ink)]">{label}<select className={controlClass} disabled><option>Choose one</option>{(field.options ?? []).map((option) => <option key={option}>{option}</option>)}{field.allowOther ? <option>Other</option> : null}</select></label>;
  if (field.type === "radio") return <fieldset className="rounded-[8px] bg-white p-3 text-sm text-[var(--ink)]"><legend>{label}</legend><div className="mt-2 flex flex-wrap gap-3">{(field.options ?? []).map((option) => <label key={option} className="flex items-center gap-2"><input type="radio" name={`preview-${field.id}`} disabled />{option}</label>)}{field.allowOther ? <span>Other</span> : null}</div></fieldset>;
  return <label className="block text-sm text-[var(--ink)]">{label}<input className={controlClass} type={field.type === "date" ? "date" : "text"} placeholder={field.placeholder} disabled /></label>;
}

function TextInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: "text" | "email" }) {
  return <label className="grid flex-1 gap-2 text-sm font-semibold text-[var(--ink)]">{label}<input className="h-11 min-w-0 rounded-[8px] border border-[var(--soft-gray)] bg-white px-3 text-base font-normal" type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
