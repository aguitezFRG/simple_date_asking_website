import Link from "next/link";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const { date } = await searchParams;
  const dateValue = Array.isArray(date) ? date[0] : date;
  const demoHref = dateValue ? `/demo?date=${encodeURIComponent(dateValue)}` : "/demo";

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-10">
      <section className="w-full max-w-3xl rounded-[8px] border-2 border-[var(--soft-gray)] bg-white/85 p-7 text-center shadow-xl shadow-[var(--thistle)] outline outline-4 outline-white/50 backdrop-blur sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ink)]">
          Date form studio
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight text-[var(--ink)] sm:text-6xl">
          Make a date invitation that feels like yours.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--ink)] sm:text-lg">
          Build a short custom wizard and share it with one unique link, or open the original date invitation as a demo.
        </p>

        <div className="mt-9 grid gap-4 sm:grid-cols-2">
          <Link
            className="flex min-h-24 items-center justify-center rounded-[8px] border-2 border-[var(--soft-gray)] bg-[var(--baby-pink)] px-6 py-5 text-lg font-black text-[var(--ink)] outline outline-2 outline-[var(--soft-gray)] transition hover:bg-[var(--pastel-petal)] focus-visible:outline-4"
            href="/create"
          >
            Make Your Own Date Form
          </Link>
          <Link
            className="flex min-h-24 items-center justify-center rounded-[8px] border-2 border-[var(--soft-gray)] bg-white px-6 py-5 text-lg font-black text-[var(--ink)] outline outline-2 outline-[var(--soft-gray)] transition hover:bg-[var(--icy-blue)] focus-visible:outline-4"
            href={demoHref}
          >
            View Demo
          </Link>
        </div>
      </section>
    </main>
  );
}
