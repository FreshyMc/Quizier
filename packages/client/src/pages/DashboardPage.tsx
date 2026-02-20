import { LinkButton } from '@client/components/LinkButton';
import { useAuth } from '../contexts/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-900 p-5">
      <h1 className="text-2xl font-semibold">Welcome, {user?.username}</h1>
      <div className="mt-4 flex gap-5">
        <LinkButton to="/game/create" variant="primary">
          Create new quiz
        </LinkButton>
        <LinkButton to="/game/join" variant="secondary">
          Join existing quiz
        </LinkButton>
      </div>
    </section>
  );
}
