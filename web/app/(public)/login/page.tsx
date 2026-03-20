import { AppShell } from '../../../components/app-shell';
import { AuthForm } from '../../../components/auth-form';

export default function LoginPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 font-display text-5xl">Welcome back</h1>
        <AuthForm mode="login" />
      </div>
    </AppShell>
  );
}

