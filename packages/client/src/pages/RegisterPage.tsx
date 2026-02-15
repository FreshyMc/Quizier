import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await register({ email, username, password });
      navigate('/dashboard');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to register');
    }
  };

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <form
        className="space-y-4 rounded border border-slate-700 bg-slate-900 p-5"
        onSubmit={onSubmit}
      >
        <h1 className="text-xl font-semibold text-white">Register</h1>
        <input
          className="w-full rounded bg-slate-800 p-2 text-sm"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full rounded bg-slate-800 p-2 text-sm"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="w-full rounded bg-slate-800 p-2 text-sm"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
        <button className="w-full rounded bg-blue-600 p-2 text-sm">Create account</button>
        <Link to="/login" className="block text-center text-xs text-blue-300">
          Already have an account?
        </Link>
      </form>
    </main>
  );
}
