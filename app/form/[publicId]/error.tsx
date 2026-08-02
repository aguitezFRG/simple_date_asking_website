"use client";

import Link from "next/link";

export default function PublicDateFormError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10 text-center">
      <section className="w-full max-w-xl rounded-[8px] border-2 border-[var(--soft-gray)] bg-white/90 p-7 shadow-xl shadow-[var(--thistle)]">
        <h1 className="text-4xl font-black text-[var(--ink)]">We could not load this date form.</h1>
        <p className="mt-4 text-[var(--ink)]">The form service may be temporarily unavailable.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button className="h-12 rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--baby-pink)] px-5 font-black text-[var(--ink)]" type="button" onClick={reset}>Try again</button>
          <Link className="inline-flex h-12 items-center justify-center rounded-[8px] border-2 border-[var(--soft-gray)] bg-white px-5 font-bold text-[var(--ink)]" href="/">Return home</Link>
        </div>
      </section>
    </main>
  );
}
