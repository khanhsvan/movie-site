'use client';

import { useState } from 'react';
import { getClientApiBaseUrl } from '../lib/api';

export function LicenseAdminForm() {
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    const payload = {
      contentTitle: formData.get('contentTitle'),
      ownerName: formData.get('ownerName'),
      issuerOrganization: formData.get('issuerOrganization'),
      validityStart: formData.get('validityStart'),
      validityEnd: formData.get('validityEnd'),
      territory: String(formData.get('territory') ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      licenseDocumentName: formData.get('licenseDocumentName'),
      attachedVideoId: formData.get('attachedVideoId')
    };

    const response = await fetch(`${getClientApiBaseUrl()}/admin/licenses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    setMessage(`Created ${data.id} with signature ${data.signature.slice(0, 16)}...`);
  }

  return (
    <form action={onSubmit} className="grid gap-4 rounded-[32px] border border-white/10 bg-white/5 p-8 md:grid-cols-2">
      <input name="contentTitle" placeholder="Content title" className="rounded-2xl bg-white/10 px-4 py-3" />
      <input name="ownerName" placeholder="Owner name" className="rounded-2xl bg-white/10 px-4 py-3" />
      <input name="issuerOrganization" placeholder="Issuer organization" className="rounded-2xl bg-white/10 px-4 py-3" />
      <input name="attachedVideoId" placeholder="Attached video ID" className="rounded-2xl bg-white/10 px-4 py-3" />
      <input name="validityStart" type="date" className="rounded-2xl bg-white/10 px-4 py-3" />
      <input name="validityEnd" type="date" className="rounded-2xl bg-white/10 px-4 py-3" />
      <input name="territory" placeholder="VN, US, SG" className="rounded-2xl bg-white/10 px-4 py-3" />
      <input name="licenseDocumentName" placeholder="License file name" className="rounded-2xl bg-white/10 px-4 py-3" />
      <button className="w-fit rounded-full bg-accent px-5 py-3 font-semibold text-ink md:col-span-2">Create license record</button>
      {message ? <p className="text-sm text-gold md:col-span-2">{message}</p> : null}
    </form>
  );
}
