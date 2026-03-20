import { AppShell } from '../../../components/app-shell';
import { LicenseVerificationForm } from '../../../components/license-verification-form';

export default function VerifyLicensePage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <p className="text-sm uppercase tracking-[0.3em] text-gold">Digital verification</p>
        <h1 className="font-display text-6xl">Verify copyright licenses</h1>
        <p className="max-w-2xl text-lg text-mist/80">
          Authorized parties can confirm license authenticity, review territory and validity windows, and match the digital signature on record.
        </p>
        <LicenseVerificationForm />
      </div>
    </AppShell>
  );
}

