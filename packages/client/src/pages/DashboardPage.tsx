import { useAuth } from '../contexts/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-5">
      <h1 className="text-2xl font-semibold">Welcome, {user?.username}</h1>
      <p className="mt-2 text-sm text-slate-300">
        Use the navigation to create/join games and manage content.
      </p>
    </section>
  );
}
