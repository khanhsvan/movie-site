import { AppShell } from '../../../components/app-shell';
import { PricingCard } from '../../../components/pricing-card';

export default function PricingPage() {
  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold">Subscription access</p>
          <h1 className="mt-4 font-display text-6xl">Unlock every premium title.</h1>
          <p className="mt-6 max-w-2xl text-lg text-mist/80">
            Guests can preview premium content. Subscribers get full playback, resume watching, and upcoming billing management.
          </p>
        </div>
        <PricingCard />
      </div>
    </AppShell>
  );
}

