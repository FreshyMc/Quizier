import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { LoadingButton } from '../components/LoadingButton';
import { useAuth } from '../contexts/AuthContext';
import { Container } from '@client/components/Container';
import { PasswordInput } from '@client/components/PasswordInput';
import { Input } from '@client/components/Input';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
      const next = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(next);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container variant="main" alignment="center">
      <form
        className="space-y-4 w-100 rounded border border-slate-700 bg-slate-900 p-5 shadow-lg"
        onSubmit={onSubmit}
      >
        <h1 className="text-xl font-semibold text-white">Login</h1>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PasswordInput
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <p className="text-xs text-rose-300">{error}</p> : null}
        <LoadingButton
          className="inline-flex w-full items-center justify-center gap-2 rounded bg-blue-600 p-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          isLoading={isSubmitting}
          loadingText="Signing in..."
        >
          Sign in
        </LoadingButton>
        <Link to="/register" className="block text-center text-xs text-blue-300">
          Create account
        </Link>
      </form>
    </Container>
  );
}
