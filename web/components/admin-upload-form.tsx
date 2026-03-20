'use client';

import { useRef, useState } from 'react';
import { getClientApiBaseUrl } from '../lib/api';

type UploadState = 'idle' | 'requesting' | 'uploading' | 'uploaded' | 'publishing' | 'done' | 'error';

export function AdminUploadForm() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState<UploadState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<any | null>(null);

  function onFileSelected(nextFile: File | null) {
    if (!nextFile) {
      return;
    }

    const isVideo = nextFile.type.startsWith('video/');
    const maxBytes = 2 * 1024 * 1024 * 1024;
    if (!isVideo) {
      setMessage('Please select a video file.');
      return;
    }
    if (nextFile.size > maxBytes) {
      setMessage('Video is too large. Maximum supported size is 2 GB in this demo flow.');
      return;
    }

    setFile(nextFile);
    setMessage(null);
    setProgress(0);
  }

  async function uploadViaBackend(videoId: string, currentFile: File) {
    const apiBaseUrl = getClientApiBaseUrl();

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${apiBaseUrl}/admin/videos/${videoId}/upload`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed due to a network error.'));
      const payload = new FormData();
      payload.append('file', currentFile);
      xhr.send(payload);
    });
  }

  async function parseJsonSafe<T>(response: Response): Promise<T | null> {
    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  async function onSubmit(formData: FormData) {
    if (!file) {
      setMessage('Please choose a video file first.');
      return;
    }

    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      type: formData.get('type'),
      accessTier: formData.get('accessTier'),
      durationSeconds: Number(formData.get('durationSeconds')),
      tags: String(formData.get('tags') ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      visibility: formData.get('visibility'),
      restrictionReason: formData.get('restrictionReason'),
      allowedRegions: String(formData.get('allowedRegions') ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      requiresVerification: formData.get('requiresVerification') === 'on',
      thumbnailUrl: formData.get('thumbnailUrl')
    };

    setLastPayload(payload);
    setState('requesting');
    setMessage('Creating video record...');

    try {
      const apiBaseUrl = getClientApiBaseUrl();
      const createResponse = await fetch(`${apiBaseUrl}/admin/videos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const created = await parseJsonSafe<{ id?: string; title?: string; message?: string }>(createResponse);

      if (!createResponse.ok || !created?.id) {
        throw new Error(created?.message ?? `Could not create the video record (${createResponse.status}).`);
      }

      setState('uploading');
      setMessage('Uploading the video securely to the server...');

      await uploadViaBackend(created.id, file);

      setState('publishing');
      setMessage('Upload complete. Publishing metadata...');

      const publishResponse = await fetch(`${apiBaseUrl}/admin/videos/${created.id}/publish`, {
        method: 'POST',
        credentials: 'include'
      });
      const published = await parseJsonSafe<{ videoId?: string; message?: string }>(publishResponse);
      if (!publishResponse.ok) {
        throw new Error(published?.message ?? `Could not publish the video (${publishResponse.status}).`);
      }
      setState('done');
      setProgress(100);
      setMessage(`Success: ${created.title ?? 'Video'} is ready. Playback URL prepared for ${published?.videoId ?? created.id}.`);
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Upload failed.');
    }
  }

  async function retryLastUpload() {
    if (!lastPayload || !file) {
      return;
    }

    const formData = new FormData();
    Object.entries(lastPayload).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        formData.set(key, value.join(', '));
      } else {
        formData.set(key, String(value ?? ''));
      }
    });
    await onSubmit(formData);
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onFileSelected(event.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-[32px] border border-dashed border-white/20 bg-white/5 p-10 text-center"
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(event) => onFileSelected(event.target.files?.[0] ?? null)}
        />
        <p className="font-display text-3xl">{file ? file.name : 'Drag and drop a video file'}</p>
        <p className="mt-3 text-sm text-mist/70">or click to choose a file. The platform will upload it for you securely.</p>
      </div>

      <form action={onSubmit} className="grid gap-4 rounded-[32px] border border-white/10 bg-white/5 p-8 md:grid-cols-2">
        <input name="title" placeholder="Title" required className="rounded-2xl bg-white/10 px-4 py-3" />
        <input name="durationSeconds" type="number" placeholder="Duration (seconds)" min={1} required className="rounded-2xl bg-white/10 px-4 py-3" />
        <select name="type" className="rounded-2xl bg-white/10 px-4 py-3">
          <option value="MOVIE">Movie</option>
          <option value="SERIES">Series</option>
        </select>
        <select name="accessTier" className="rounded-2xl bg-white/10 px-4 py-3">
          <option value="FREE">Free</option>
          <option value="PREMIUM">Premium</option>
        </select>
        <select name="visibility" className="rounded-2xl bg-white/10 px-4 py-3">
          <option value="PUBLIC">Public</option>
          <option value="PRIVATE">Private</option>
          <option value="RESTRICTED">Restricted</option>
        </select>
        <select name="restrictionReason" className="rounded-2xl bg-white/10 px-4 py-3">
          <option value="NONE">No restriction</option>
          <option value="COPYRIGHT">Copyright review</option>
          <option value="DMCA">DMCA flagged</option>
          <option value="REGION">Region restricted</option>
          <option value="VERIFICATION">Requires verification</option>
        </select>
        <input name="allowedRegions" placeholder="Allowed regions: VN, US" className="rounded-2xl bg-white/10 px-4 py-3" />
        <input name="thumbnailUrl" placeholder="Thumbnail URL" className="rounded-2xl bg-white/10 px-4 py-3" />
        <input name="tags" placeholder="Tags comma-separated" className="rounded-2xl bg-white/10 px-4 py-3 md:col-span-2" />
        <textarea name="description" placeholder="Description" required className="min-h-40 rounded-2xl bg-white/10 px-4 py-3 md:col-span-2" />
        <label className="flex items-center gap-3 text-sm text-mist/85 md:col-span-2">
          <input name="requiresVerification" type="checkbox" />
          Require verification before playback
        </label>
        <div className="md:col-span-2">
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-sm text-mist/70">
            Status: {state} {progress ? `(${progress}%)` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button className="rounded-full bg-accent px-5 py-3 font-semibold text-ink">Create and upload</button>
          <button type="button" onClick={retryLastUpload} className="rounded-full border border-white/15 px-5 py-3 text-mist">
            Retry last upload
          </button>
        </div>
        {message ? <p className="self-center text-sm text-gold md:col-span-2">{message}</p> : null}
      </form>
    </div>
  );
}
