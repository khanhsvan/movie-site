'use client';

import { useState } from 'react';
import { getClientApiBaseUrl } from '../lib/api';

export function PricingCard() {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);
    try {
      const response = await fetch(`${getClientApiBaseUrl()}/subscriptions/checkout`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await response.json();
      window.location.href = data.checkoutUrl;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[32px] border border-gold/30 bg-white/5 p-8">
      <p className="text-sm uppercase tracking-[0.3em] text-gold">Premium</p>
      <h2 className="mt-4 font-display text-4xl">$11.99/mo</h2>
      <p className="mt-4 text-mist/80">Unlimited premium playback, full series access, and cross-device resume watching.</p>
      <button onClick={startCheckout} disabled={loading} className="mt-6 rounded-full bg-gold px-5 py-3 font-semibold text-ink">
        {loading ? 'Redirecting...' : 'Start Subscription'}
      </button>
    </div>
  );
}
