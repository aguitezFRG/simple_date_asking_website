import Link from "next/link";

export default function PublicDateFormNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10 text-center">
      <section className="w-full max-w-xl rounded-[8px] border-2 border-[var(--soft-gray)] bg-white/90 p-7 shadow-xl shadow-[var(--thistle)]">
        <h1 className="text-4xl font-black text-[var(--ink)]">This date form is unavailable.</h1>
        <p className="mt-4 text-[var(--ink)]">
          The link may be invalid, missing, disabled, expired, or no longer available.
        </p>
        <Link className="mt-7 inline-flex h-12 items-center rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--baby-pink)] px-5 font-black text-[var(--ink)]" href="/">
          Back to Home
        </Link>
      </section>
    </main>
  );
}
