'use client';

import { useState } from 'react';
import { getClientApiBaseUrl } from '../lib/api';

export function LicenseVerificationForm() {
  const [result, setResult] = useState<any | null>(null);

  async function onSubmit(formData: FormData) {
    const licenseId = String(formData.get('licenseId') ?? '');
    const response = await fetch(`${getClientApiBaseUrl()}/licenses/verify/${licenseId}`);
    const data = await response.json();
    setResult(data);
  }

  return (
    <div className="space-y-6 rounded-[32px] border border-white/10 bg-white/5 p-8">
      <form action={onSubmit} className="flex flex-col gap-4 md:flex-row">
        <input name="licenseId" placeholder="Enter License ID" className="flex-1 rounded-2xl bg-white/10 px-4 py-3" />
        <button className="rounded-full bg-accent px-5 py-3 font-semibold text-ink">Verify</button>
      </form>
      {result ? (
        <div className="rounded-2xl border border-gold/20 bg-black/20 p-5 text-sm text-mist/85">
          <p className="font-medium text-white">Authentic: {String(result.authentic)}</p>
          <p className="mt-2">Content: {result.record.contentTitle}</p>
          <p>Owner: {result.record.ownerName}</p>
          <p>Issuer: {result.record.issuerOrganization}</p>
          <p>Status: {result.record.status}</p>
          <p>Signature: {result.record.signature}</p>
          <div className="mt-4 rounded-2xl border border-dashed border-white/15 px-4 py-5 text-center text-xs uppercase tracking-[0.25em] text-mist/60">
            QR verification placeholder
          </div>
        </div>
      ) : null}
    </div>
  );
}
