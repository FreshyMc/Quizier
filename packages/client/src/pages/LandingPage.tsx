import { Link } from 'react-router';

export function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-6 py-16 text-center">
      <h1 className="text-4xl font-bold text-white">Quizier</h1>
      <p className="text-slate-300">Real-time turn-based multiplayer quiz platform.</p>
      <div className="flex justify-center gap-3">
        <Link className="rounded bg-blue-600 px-4 py-2 text-sm text-white" to="/login">
          Login
        </Link>
        <Link className="rounded bg-slate-700 px-4 py-2 text-sm text-white" to="/register">
          Register
        </Link>
      </div>
    </main>
  );
}
