"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BUILDER_DRAFT_STORAGE_KEY } from "../../lib/date-forms/builder-draft";

export default function DemoActions() {
  const router = useRouter();

  function useDemo() {
    const draft = sessionStorage.getItem(BUILDER_DRAFT_STORAGE_KEY);
    if (draft && !window.confirm("Replace your unsaved builder draft with the demo form?")) {
      return;
    }
    sessionStorage.removeItem(BUILDER_DRAFT_STORAGE_KEY);
    router.push("/create?preset=demo");
  }

  return (
    <nav aria-label="Demo actions" className="fixed inset-x-4 top-4 z-20 mx-auto flex max-w-xl flex-col gap-2 rounded-[8px] border border-[var(--soft-gray)] bg-white/95 p-3 shadow-lg sm:flex-row">
      <button type="button" className="h-11 flex-1 rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--baby-pink)] px-4 font-black text-[var(--ink)]" onClick={useDemo}>Use Demo Form</button>
      <Link className="inline-flex h-11 flex-1 items-center justify-center rounded-[8px] border-2 border-[var(--soft-gray)] bg-white px-4 font-bold text-[var(--ink)]" href="/">Back to Home</Link>
    </nav>
  );
}
