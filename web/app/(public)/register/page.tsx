import { AppShell } from '../../../components/app-shell';
import { AuthForm } from '../../../components/auth-form';

export default function RegisterPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 font-display text-5xl">Create account</h1>
        <AuthForm mode="register" />
      </div>
    </AppShell>
  );
}

