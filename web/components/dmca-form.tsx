'use client';

import { useState } from 'react';
import { getClientApiBaseUrl } from '../lib/api';

export function DmcaForm() {
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    const payload = {
      reporterName: formData.get('reporterName'),
      reporterEmail: formData.get('reporterEmail'),
      contentUrl: formData.get('contentUrl'),
      reason: formData.get('reason')
    };

    const response = await fetch(`${getClientApiBaseUrl()}/dmca-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    setMessage(`Submitted ${data.id}. Content flagged for review: ${data.affectedContentDisabled}`);
  }

  return (
    <form action={onSubmit} className="grid gap-4 rounded-[32px] border border-white/10 bg-white/5 p-8">
      <input name="reporterName" placeholder="Your name" className="rounded-2xl bg-white/10 px-4 py-3" />
      <input name="reporterEmail" type="email" placeholder="Email" className="rounded-2xl bg-white/10 px-4 py-3" />
      <input name="contentUrl" placeholder="Content URL" className="rounded-2xl bg-white/10 px-4 py-3" />
      <textarea name="reason" placeholder="Reason for claim" className="min-h-36 rounded-2xl bg-white/10 px-4 py-3" />
      <button className="w-fit rounded-full bg-accent px-5 py-3 font-semibold text-ink">Submit takedown request</button>
      {message ? <p className="text-sm text-gold">{message}</p> : null}
    </form>
  );
}
