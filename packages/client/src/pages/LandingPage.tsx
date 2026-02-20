import { Container } from '@client/components/Container';
import { LinkButton } from '@client/components/LinkButton';

export function LandingPage() {
  return (
    <Container variant="main" alignment="center">
      <div className="flex flex-col gap-5">
        <h1 className="text-6xl font-bold text-white text-center text-shadow-lg/30">Quizier</h1>
        <div className="call-to-action-area flex flex-col gap-5 py-5 px-10 bg-white rounded shadow-lg text-center">
          <p className="text-black text-lg">Real-time multiplayer quiz platform.</p>
          <div className="flex justify-center gap-3">
            <LinkButton to="/login">Login</LinkButton>
            <LinkButton to="/register" variant="secondary">
              Register
            </LinkButton>
          </div>
        </div>
      </div>
    </Container>
  );
}
