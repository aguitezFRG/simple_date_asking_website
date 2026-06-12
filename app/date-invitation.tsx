"use client";

import { FormEvent, useCallback, useMemo, useRef, useState } from "react";
import { dateOptions } from "./date-options";

type Stage = "invite" | "form" | "success";
type Position = { left: number; top: number } | null;
type FieldErrors = Partial<
  Record<"recipientEmail" | "respondentEmail" | "lunchPlace" | "activity", string>
>;

const OTHER_VALUE = "__other__";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveChoice(value: string, customValue: string) {
  return value === OTHER_VALUE ? customValue.trim() : value;
}

function getSafePosition(
  button: HTMLButtonElement,
  avoidElements: Array<HTMLElement | null>,
) {
  const buttonRect = button.getBoundingClientRect();
  const padding = 16;
  const maxLeft = Math.max(padding, window.innerWidth - buttonRect.width - padding);
  const maxTop = Math.max(padding, window.innerHeight - buttonRect.height - padding);
  const avoidRects = avoidElements
    .filter((element): element is HTMLElement => Boolean(element))
    .map((element) => element.getBoundingClientRect());

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const left = padding + Math.random() * Math.max(1, maxLeft - padding);
    const top = padding + Math.random() * Math.max(1, maxTop - padding);
    const candidate = {
      left,
      top,
      right: left + buttonRect.width,
      bottom: top + buttonRect.height,
    };

    const overlaps = avoidRects.some((rect) => {
      const buffer = 18;
      return !(
        candidate.right < rect.left - buffer ||
        candidate.left > rect.right + buffer ||
        candidate.bottom < rect.top - buffer ||
        candidate.top > rect.bottom + buffer
      );
    });

    if (!overlaps) {
      return { left, top };
    }
  }

  return { left: maxLeft, top: maxTop };
}

export default function DateInvitation() {
  const [stage, setStage] = useState<Stage>("invite");
  const [yesScale, setYesScale] = useState(1);
  const [noPosition, setNoPosition] = useState<Position>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [lunchPlace, setLunchPlace] = useState("");
  const [customLunchPlace, setCustomLunchPlace] = useState("");
  const [activity, setActivity] = useState("");
  const [customActivity, setCustomActivity] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const titleRef = useRef<HTMLHeadingElement>(null);
  const yesButtonRef = useRef<HTMLButtonElement>(null);
  const noButtonRef = useRef<HTMLButtonElement>(null);

  const yesTransform = useMemo(
    () => ({ transform: `scale(${yesScale})` }),
    [yesScale],
  );

  const moveNoButton = useCallback(() => {
    const noButton = noButtonRef.current;
    if (!noButton) {
      return;
    }

    setYesScale((scale) => Number((scale * 1.1).toFixed(4)));
    setNoPosition(getSafePosition(noButton, [titleRef.current, yesButtonRef.current]));
  }, []);

  const validate = () => {
    const nextErrors: FieldErrors = {};
    const resolvedLunchPlace = resolveChoice(lunchPlace, customLunchPlace);
    const resolvedActivity = resolveChoice(activity, customActivity);

    if (!EMAIL_PATTERN.test(recipientEmail.trim())) {
      nextErrors.recipientEmail = "Enter a valid recipient email address.";
    }

    if (!EMAIL_PATTERN.test(respondentEmail.trim())) {
      nextErrors.respondentEmail = "Enter a valid email address.";
    }

    if (!resolvedLunchPlace) {
      nextErrors.lunchPlace = "Choose a lunch place.";
    }

    if (!resolvedActivity) {
      nextErrors.activity = "Choose an activity.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/submit-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: recipientEmail.trim(),
          respondentEmail: respondentEmail.trim(),
          lunchPlace: resolveChoice(lunchPlace, customLunchPlace),
          activity: resolveChoice(activity, customActivity),
        }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Unable to send your answer right now.");
      }

      setStage("success");
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to send your answer right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (stage === "success") {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6 text-center">
        <h1 className="max-w-3xl text-5xl font-bold leading-tight text-[var(--ink)] sm:text-7xl">
          See you there, I love you!
        </h1>
      </main>
    );
  }

  if (stage === "form") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-2xl items-center px-6 py-10">
        <form
          className="w-full rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--pastel-petal)] p-6 shadow-xl shadow-[var(--thistle)] outline outline-4 outline-[var(--soft-gray)] sm:p-8"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)]">
              Date details
            </p>
            <h1 className="mt-3 text-3xl font-bold text-[var(--ink)] sm:text-4xl">
              Pick what sounds perfect.
            </h1>
          </div>


          <div className="grid gap-5">
            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
              Your Email
              <input
                className="h-12 rounded-[8px] border border-[var(--soft-gray)] bg-white px-4 text-base font-normal outline-none transition ease-in-out focus:border-[var(--soft-gray)] focus:ring-4 focus:ring-[var(--soft-gray)]"
                type="email"
                value={respondentEmail}
                onChange={(event) => setRespondentEmail(event.target.value)}
                required
              />
              {errors.respondentEmail ? (
                <span className="text-sm text-[var(--error)]">
                  {errors.respondentEmail}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
              Recipient Email
              <input
                className="h-12 rounded-[8px] border border-[var(--soft-gray)] bg-white px-4 text-base font-normal outline-none transition ease-in-out focus:border-[var(--soft-gray)] focus:ring-4 focus:ring-[var(--soft-gray)]"
                type="email"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                required
              />
              {errors.recipientEmail ? (
                <span className="text-sm text-[var(--error)]">
                  {errors.recipientEmail}
                </span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
              Lunch place
              <select
                className="h-12 rounded-[8px] border border-[var(--soft-gray)] bg-white px-4 text-base font-normal outline-none transition ease-in-out focus:border-[var(--soft-gray)] focus:ring-4 focus:ring-[var(--soft-gray)]"
                value={lunchPlace}
                onChange={(event) => setLunchPlace(event.target.value)}
                required
              >
                <option value="">Choose one</option>
                {dateOptions.lunchPlace.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={OTHER_VALUE}>Other</option>
              </select>
              {lunchPlace === OTHER_VALUE ? (
                <input
                  className="h-12 rounded-[8px] border border-[var(--soft-gray)] bg-white px-4 text-base font-normal outline-none transition ease-in-out focus:border-[var(--soft-gray)] focus:ring-4 focus:ring-[var(--soft-gray)]"
                  value={customLunchPlace}
                  onChange={(event) => setCustomLunchPlace(event.target.value)}
                  placeholder="Type your lunch place"
                  required
                />
              ) : null}
              {errors.lunchPlace ? (
                <span className="text-sm text-[var(--error)]">{errors.lunchPlace}</span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[var(--ink)]">
              Pre-going-home activity
              <select
                className="h-12 rounded-[8px] border border-[var(--soft-gray)] bg-white px-4 text-base font-normal outline-none transition ease-in-out focus:border-[var(--soft-gray)] focus:ring-4 focus:ring-[var(--soft-gray)]"
                value={activity}
                onChange={(event) => setActivity(event.target.value)}
                required
              >
                <option value="">Choose one</option>
                {dateOptions.preGoingHomeActivity.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={OTHER_VALUE}>Other</option>
              </select>
              {activity === OTHER_VALUE ? (
                <input
                  className="h-12 rounded-[8px] border border-[var(--soft-gray)] bg-white px-4 text-base font-normal outline-none transition ease-in-out focus:border-[var(--soft-gray)] focus:ring-4 focus:ring-[var(--soft-gray)]"
                  value={customActivity}
                  onChange={(event) => setCustomActivity(event.target.value)}
                  placeholder="Type your activity"
                  required
                />
              ) : null}
              {errors.activity ? (
                <span className="text-sm text-[var(--error)]">{errors.activity}</span>
              ) : null}
            </label>
          </div>

          {submitError ? (
            <p className="mt-5 rounded-[8px] bg-[var(--baby-pink)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
              {submitError}
            </p>
          ) : null}

          <button
            className="mt-7 h-12 w-full rounded-[8px] border-2 border-[var(--soft-gray)] bg-white px-5 text-base font-bold text-[var(--ink)] outline outline-2 outline-[var(--soft-gray)] transition ease-in-out hover:bg-[var(--deep-petal)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Sending..." : "Send my answer"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh overflow-hidden px-6 py-10">
      <section className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center text-center">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ink)]">
          June 13
        </p>
        <h1
          ref={titleRef}
          className="max-w-3xl text-5xl font-black leading-tight text-[var(--ink)] sm:text-7xl"
        >
          Would you like to be my date?
        </h1>
        <div className="mt-12 flex min-h-24 items-center justify-center gap-5">
          <button
            ref={yesButtonRef}
            className="h-14 rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--baby-pink)] px-8 text-lg font-black text-[var(--ink)] outline outline-2 outline-[var(--soft-gray)] shadow-lg shadow-[var(--thistle)] transition duration-200 ease-in-out hover:bg-[var(--pastel-petal)]"
            style={yesTransform}
            type="button"
            onClick={() => setStage("form")}
          >
            Yes
          </button>
          <button
            ref={noButtonRef}
            className="h-14 rounded-[8px] border-2 border-[var(--soft-gray)] bg-white px-8 text-lg font-bold text-[var(--ink)] outline outline-2 outline-[var(--soft-gray)] shadow-lg shadow-[var(--thistle)] transition-[left,top,background-color] duration-200 ease-in-out hover:bg-[var(--icy-blue)]"
            style={
              noPosition
                ? { left: noPosition.left, position: "fixed", top: noPosition.top }
                : undefined
            }
            type="button"
            onClick={moveNoButton}
            onMouseEnter={moveNoButton}
          >
            No
          </button>
        </div>
      </section>
    </main>
  );
}
