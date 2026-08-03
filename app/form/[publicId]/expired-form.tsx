export default function ExpiredDateForm() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10 text-center">
      <section className="w-full max-w-xl rounded-[8px] border-2 border-[var(--soft-gray)] bg-white/90 p-7 shadow-xl shadow-[var(--thistle)]">
        <h1 className="text-4xl font-black text-[var(--ink)]">This form has expired</h1>
        <p className="mt-4 text-[var(--ink)]">Its fields and submission controls are no longer available.</p>
      </section>
    </main>
  );
}
