import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">
          Meletiou Mathematics
        </p>

        <h1 className="max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
          Project Z
        </h1>

        <p className="mt-6 max-w-3xl text-xl leading-8 text-slate-300">
          An AI-powered mathematics learning platform for students, teachers,
          and parents. Choose your portal to begin.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <Link
            href="/dashboard"
            className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-6 transition hover:bg-cyan-400/20"
          >
            <h2 className="text-2xl font-bold">Student Portal</h2>
            <p className="mt-3 text-slate-300">
              Practise questions, get AI hints, and build mastery.
            </p>
          </Link>

          <Link
            href="/teacher"
            className="rounded-2xl border border-violet-400/30 bg-violet-400/10 p-6 transition hover:bg-violet-400/20"
          >
            <h2 className="text-2xl font-bold">Teacher Portal</h2>
            <p className="mt-3 text-slate-300">
              View classes, assignments, progress, and intervention needs.
            </p>
          </Link>

          <Link
            href="/parent"
            className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6 transition hover:bg-emerald-400/20"
          >
            <h2 className="text-2xl font-bold">Parent Portal</h2>
            <p className="mt-3 text-slate-300">
              Follow learner progress and weekly recommendations.
            </p>
          </Link>
        </div>

        <div className="mt-8">
          <Link
            href="/auth"
            className="inline-flex rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-200"
          >
            Sign in or create account
          </Link>
        </div>
      </section>
    </main>
  );
}
