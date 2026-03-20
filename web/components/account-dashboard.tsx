'use client';

import Link from 'next/link';
import { SubscriptionStatus, UserSummary } from '@netflix-mini/types';
import { useMemo, useState } from 'react';
import { getClientApiBaseUrl } from '../lib/api';

type SubscriptionView = {
  status: SubscriptionStatus | string;
  renewalDate: string;
  planName: string;
};

type ContinueWatchingItem = {
  videoId: string;
  episodeId?: string;
  title: string;
  progressSeconds: number;
  durationSeconds: number;
  updatedAt: string;
};

type Props = {
  profile: UserSummary;
  subscription: SubscriptionView;
  continueWatching: ContinueWatchingItem[];
};

export function AccountDashboard({ profile, subscription, continueWatching }: Props) {
  const [name, setName] = useState(profile.name ?? '');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  const memberSince = useMemo(() => {
    if (!profile.acceptedTosAt) {
      return 'New member';
    }

    return new Date(profile.acceptedTosAt).toLocaleDateString();
  }, [profile.acceptedTosAt]);

  async function saveProfile() {
    setSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(`${getClientApiBaseUrl()}/users/me`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        throw new Error(`Could not save your profile (${response.status}).`);
      }

      setSaveMessage('Your profile was updated successfully.');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not update your profile.');
    } finally {
      setSaving(false);
    }
  }

  async function openBilling() {
    setBillingLoading(true);
    setSaveMessage(null);

    try {
      const endpoint =
        subscription.status === SubscriptionStatus.ACTIVE ? '/subscriptions/portal' : '/subscriptions/checkout';
      const response = await fetch(`${getClientApiBaseUrl()}${endpoint}`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = (await response.json()) as { portalUrl?: string; checkoutUrl?: string; message?: string };
      const redirectUrl = data.portalUrl ?? data.checkoutUrl;

      if (!response.ok || !redirectUrl) {
        throw new Error(data.message ?? `Could not open billing (${response.status}).`);
      }

      window.location.href = redirectUrl;
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Could not open billing.');
    } finally {
      setBillingLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-gold">Your account</p>
          <h1 className="mt-4 font-display text-5xl">{name || profile.email}</h1>
          <p className="mt-3 text-lg text-mist/75">{profile.email}</p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <StatusCard label="Membership" value={subscription.planName} hint={`Status: ${subscription.status}`} />
            <StatusCard label="Role" value={profile.role} hint={profile.isEmailVerified ? 'Verified email' : 'Email not verified'} />
            <StatusCard label="Member since" value={memberSince} hint={profile.acceptedTosVersion ? `ToS ${profile.acceptedTosVersion}` : 'Terms not accepted'} />
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-mist/60">Subscription</p>
          <h2 className="mt-4 font-display text-4xl">{subscription.status}</h2>
          <p className="mt-3 text-mist/75">Plan: {subscription.planName}</p>
          <p className="mt-2 text-mist/75">Renewal date: {new Date(subscription.renewalDate).toLocaleDateString()}</p>
          <button
            type="button"
            onClick={openBilling}
            disabled={billingLoading}
            className="mt-6 rounded-full bg-accent px-5 py-3 font-semibold text-ink disabled:opacity-60"
          >
            {billingLoading
              ? 'Opening...'
              : subscription.status === SubscriptionStatus.ACTIVE
                ? 'Manage billing'
                : 'Upgrade plan'}
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-mist/60">Profile settings</p>
          <div className="mt-6 space-y-4">
            <label className="block text-sm text-mist/75">
              Display name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-2xl bg-white/10 px-4 py-3 text-white"
                placeholder="How your name appears on the platform"
              />
            </label>
            <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-sm text-mist/75">
              <p>Email verification: {profile.isEmailVerified ? 'Verified' : 'Pending verification'}</p>
              <p className="mt-2">Permissions: {(profile.permissions ?? []).join(', ') || 'Standard viewer access'}</p>
            </div>
            <button
              type="button"
              onClick={saveProfile}
              disabled={saving}
              className="rounded-full bg-gold px-5 py-3 font-semibold text-ink disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save profile'}
            </button>
            {saveMessage ? <p className="text-sm text-gold">{saveMessage}</p> : null}
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-mist/60">Continue watching</p>
              <h2 className="mt-3 font-display text-4xl">Pick up where you left off</h2>
            </div>
            <Link href="/videos" className="rounded-full border border-white/15 px-4 py-2 text-sm text-mist">
              View library
            </Link>
          </div>

          <div className="mt-6 space-y-4">
            {continueWatching.length ? (
              continueWatching.map((item) => {
                const progress = item.durationSeconds > 0 ? Math.min(100, Math.round((item.progressSeconds / item.durationSeconds) * 100)) : 0;
                return (
                  <Link
                    key={`${item.videoId}-${item.episodeId ?? 'main'}`}
                    href={`/watch/${item.videoId}${item.episodeId ? `?episodeId=${item.episodeId}` : ''}`}
                    className="block rounded-2xl border border-white/10 px-5 py-4 transition hover:border-accent/50 hover:bg-white/5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-sm text-mist/70">
                          {item.progressSeconds}s watched
                          {item.durationSeconds ? ` of ${item.durationSeconds}s` : ''}
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-mist/50">
                          Updated {new Date(item.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-mist">{progress}%</span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 px-5 py-8 text-center text-mist/70">
                No viewing history yet. Start a movie or series and it will appear here automatically.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatusCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-mist/55">{label}</p>
      <p className="mt-3 font-display text-2xl text-white">{value}</p>
      <p className="mt-2 text-sm text-mist/65">{hint}</p>
    </div>
  );
}
