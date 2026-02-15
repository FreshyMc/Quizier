import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await login({ email, password });
      const next = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(next);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to login');
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <form
        className="space-y-4 rounded border border-slate-700 bg-slate-900 p-5"
        onSubmit={onSubmit}
      >
        <h1 className="text-xl font-semibold text-white">Login</h1>
        <input
          className="w-full rounded bg-slate-800 p-2 text-sm"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded bg-slate-800 p-2 text-sm"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
        <button className="w-full rounded bg-blue-600 p-2 text-sm">Sign in</button>
        <Link to="/register" className="block text-center text-xs text-blue-300">
          Create account
        </Link>
      </form>
    </main>
  );
}
