'use client';

import { useEffect, useState } from 'react';
import { getClientApiBaseUrl } from '../lib/api';

type SeriesOption = {
  id: string;
  title: string;
  slug: string;
};

export function EpisodeManager() {
  const [seriesOptions, setSeriesOptions] = useState<SeriesOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    async function loadSeries() {
      try {
        const response = await fetch(`${getClientApiBaseUrl()}/admin/series`, {
          credentials: 'include'
        });

        const data = (await response.json()) as SeriesOption[];
        if (!response.ok) {
          throw new Error(`Could not load series (${response.status}).`);
        }

        setSeriesOptions(data);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not load series list.');
      } finally {
        setLoading(false);
      }
    }

    void loadSeries();
  }, []);

  async function onSubmit(formData: FormData) {
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        seriesId: String(formData.get('seriesId') ?? ''),
        title: String(formData.get('title') ?? ''),
        description: String(formData.get('description') ?? ''),
        seasonNumber: Number(formData.get('seasonNumber') ?? 1),
        episodeNumber: Number(formData.get('episodeNumber') ?? 1),
        durationSeconds: Number(formData.get('durationSeconds') ?? 1),
        thumbnailUrl: String(formData.get('thumbnailUrl') ?? '')
      };

      const response = await fetch(`${getClientApiBaseUrl()}/admin/episodes`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = (await response.json()) as { id?: string; message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? `Could not create episode (${response.status}).`);
      }

      if (file && data.id) {
        await uploadEpisodeFile(data.id, file);
        setMessage(`Episode created and uploaded successfully with ID ${data.id}.`);
        return;
      }

      setMessage(`Episode created successfully with ID ${data.id}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the episode.');
    } finally {
      setSaving(false);
    }
  }

  async function uploadEpisodeFile(episodeId: string, currentFile: File) {
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${getClientApiBaseUrl()}/admin/episodes/${episodeId}/upload`);
      xhr.withCredentials = true;
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Episode upload failed with status ${xhr.status}`));
        }
      };
      xhr.onerror = () => reject(new Error('Episode upload failed due to a network error.'));
      const payload = new FormData();
      payload.append('file', currentFile);
      xhr.send(payload);
    });
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-gold">Series episodes</p>
          <h2 className="mt-3 font-display text-4xl">Add a new episode</h2>
          <p className="mt-3 max-w-2xl text-mist/75">
            Choose an existing series, then create episode metadata for season and episode ordering. This gives your team a proper place to grow a series catalog.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-mist/70">
          {loading ? 'Loading series...' : `${seriesOptions.length} series available`}
        </div>
      </div>

      <form action={onSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
        <select name="seriesId" required className="rounded-2xl bg-white/10 px-4 py-3">
          <option value="">Select a series</option>
          {seriesOptions.map((series) => (
            <option key={series.id} value={series.id}>
              {series.title}
            </option>
          ))}
        </select>
        <input name="title" required placeholder="Episode title" className="rounded-2xl bg-white/10 px-4 py-3" />
        <input name="seasonNumber" type="number" min={1} required placeholder="Season number" className="rounded-2xl bg-white/10 px-4 py-3" />
        <input name="episodeNumber" type="number" min={1} required placeholder="Episode number" className="rounded-2xl bg-white/10 px-4 py-3" />
        <input name="durationSeconds" type="number" min={1} required placeholder="Duration in seconds" className="rounded-2xl bg-white/10 px-4 py-3" />
        <input name="thumbnailUrl" placeholder="Episode thumbnail URL (optional)" className="rounded-2xl bg-white/10 px-4 py-3" />
        <label className="rounded-2xl border border-dashed border-white/15 px-4 py-3 text-sm text-mist/75">
          Episode video file (optional for now)
          <input
            type="file"
            accept="video/*"
            className="mt-3 block w-full text-sm text-mist/70"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <textarea name="description" required placeholder="Episode description" className="min-h-36 rounded-2xl bg-white/10 px-4 py-3 md:col-span-2" />
        <div className="md:col-span-2 flex flex-wrap items-center gap-4">
          <button type="submit" disabled={saving || loading || !seriesOptions.length} className="rounded-full bg-accent px-5 py-3 font-semibold text-ink disabled:opacity-60">
            {saving ? 'Saving episode...' : 'Create episode'}
          </button>
          <p className="text-sm text-mist/65">You can create metadata only, or attach an episode video file right away.</p>
        </div>
        {message ? <p className="md:col-span-2 text-sm text-gold">{message}</p> : null}
      </form>
    </section>
  );
}
