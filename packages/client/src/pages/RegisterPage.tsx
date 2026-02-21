import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { LoadingButton } from '../components/LoadingButton';
import { useAuth } from '../contexts/AuthContext';
import { Container } from '@client/components/Container';
import { Input } from '@client/components/Input';
import { PasswordInput } from '@client/components/PasswordInput';
import { useFormErrors } from '@client/hooks/useFormErrors';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { fieldErrors, formError, clearErrors, clearFieldError, handleSubmitError } = useFormErrors<
    'email' | 'username' | 'password'
  >();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearErrors();
    setIsSubmitting(true);
    try {
      await register({ email, username, password });
      navigate('/dashboard');
    } catch (submitError) {
      handleSubmitError(submitError, 'Unable to register');
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
        <h1 className="text-xl font-semibold text-white">Register</h1>
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            clearFieldError('email');
          }}
        />
        {fieldErrors.email ? <p className="text-xs text-rose-300">{fieldErrors.email}</p> : null}
        <Input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            clearFieldError('username');
          }}
        />
        {fieldErrors.username ? (
          <p className="text-xs text-rose-300">{fieldErrors.username}</p>
        ) : null}
        <PasswordInput
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            clearFieldError('password');
          }}
        />
        {fieldErrors.password ? (
          <p className="text-xs text-rose-300">{fieldErrors.password}</p>
        ) : null}
        {formError ? <p className="text-xs text-rose-300">{formError}</p> : null}
        <LoadingButton
          className="inline-flex w-full items-center justify-center gap-2 rounded bg-blue-600 p-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          isLoading={isSubmitting}
          loadingText="Creating account..."
        >
          Create account
        </LoadingButton>
        <Link to="/login" className="block text-center text-xs text-blue-300">
          Already have an account?
        </Link>
      </form>
    </Container>
  );
}
