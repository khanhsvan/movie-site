'use client';

import { UserRole, VideoAccessTier, VideoType, VideoVisibility } from '@netflix-mini/types';
import { useEffect, useMemo, useState } from 'react';
import { getClientApiBaseUrl } from '../lib/api';

type AdminVideo = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: VideoType;
  accessTier: VideoAccessTier;
  durationSeconds: number;
  thumbnailUrl: string;
  visibility: VideoVisibility;
};

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  isBanned?: boolean;
};

type EditorState = {
  id?: string;
  title: string;
  description: string;
  type: VideoType;
  accessTier: VideoAccessTier;
  durationSeconds: number;
  thumbnailUrl: string;
  visibility: VideoVisibility;
};

const emptyVideo: EditorState = {
  title: '',
  description: '',
  type: VideoType.MOVIE,
  accessTier: VideoAccessTier.FREE,
  durationSeconds: 1800,
  thumbnailUrl: '',
  visibility: VideoVisibility.PUBLIC
};

export function AdminControlCenter({ canManageUsers }: { canManageUsers: boolean }) {
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editor, setEditor] = useState<EditorState>(emptyVideo);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'videos' | 'users'>('videos');

  async function loadAll() {
    setLoading(true);
    setMessage(null);

    try {
      const apiBaseUrl = getClientApiBaseUrl();
      const [videoResponse, userResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/admin/videos`, { credentials: 'include' }),
        canManageUsers ? fetch(`${apiBaseUrl}/admin/users`, { credentials: 'include' }) : Promise.resolve(null)
      ]);

      if (!videoResponse.ok) {
        throw new Error(`Could not load videos (${videoResponse.status}).`);
      }

      const videoData = (await videoResponse.json()) as AdminVideo[];
      setVideos(videoData);

      if (userResponse) {
        if (!userResponse.ok) {
          throw new Error(`Could not load users (${userResponse.status}).`);
        }
        const userData = (await userResponse.json()) as AdminUser[];
        setUsers(userData);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load admin data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, [canManageUsers]);

  const sortedVideos = useMemo(
    () => [...videos].sort((left, right) => left.title.localeCompare(right.title)),
    [videos]
  );

  async function saveVideo() {
    setSaving(true);
    setMessage(null);

    try {
      const apiBaseUrl = getClientApiBaseUrl();
      const endpoint = editor.id ? `${apiBaseUrl}/admin/videos/${editor.id}` : `${apiBaseUrl}/admin/videos`;
      const method = editor.id ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editor)
      });

      if (!response.ok) {
        throw new Error(`Could not save the title (${response.status}).`);
      }

      await loadAll();
      setEditor(emptyVideo);
      setMessage(editor.id ? 'The video was updated successfully.' : 'The new video was created successfully.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the video.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteVideo(video: AdminVideo) {
    const confirmed = window.confirm(`Delete "${video.title}"? This cannot be undone.`);
    if (!confirmed) {
      return;
    }

    setMessage(null);

    try {
      const apiBaseUrl = getClientApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/admin/videos/${video.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Could not delete the video (${response.status}).`);
      }

      await loadAll();
      if (editor.id === video.id) {
        setEditor(emptyVideo);
      }
      setMessage('The video was deleted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete the video.');
    }
  }

  async function saveUser(user: AdminUser, nextRole: UserRole, isBanned: boolean) {
    setMessage(null);

    try {
      const apiBaseUrl = getClientApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/admin/users/${user.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole, isBanned })
      });

      if (!response.ok) {
        throw new Error(`Could not update ${user.email} (${response.status}).`);
      }

      await loadAll();
      setMessage(`Saved changes for ${user.email}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update the user.');
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-gold">Admin control center</p>
            <h1 className="mt-3 font-display text-5xl">Manage your platform without touching the database directly.</h1>
            <p className="mt-4 max-w-3xl text-lg text-mist/80">
              Use the simple forms below to add new titles, update existing records, remove old ones, and control user access.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setActiveSection('videos')}
              className={`rounded-full px-5 py-3 text-sm ${activeSection === 'videos' ? 'bg-accent font-semibold text-ink' : 'border border-white/15 text-mist'}`}
            >
              Video library
            </button>
            {canManageUsers ? (
              <button
                type="button"
                onClick={() => setActiveSection('users')}
                className={`rounded-full px-5 py-3 text-sm ${activeSection === 'users' ? 'bg-accent font-semibold text-ink' : 'border border-white/15 text-mist'}`}
              >
                User access
              </button>
            ) : null}
          </div>
        </div>
        {message ? <p className="mt-6 rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">{message}</p> : null}
      </section>

      {activeSection === 'videos' ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-4xl">{editor.id ? 'Edit selected video' : 'Create a new video'}</h2>
                <p className="mt-3 text-sm text-mist/70">Fill in the basic details and press save. Everything else stays automatic.</p>
              </div>
              {editor.id ? (
                <button type="button" onClick={() => setEditor(emptyVideo)} className="rounded-full border border-white/15 px-4 py-2 text-sm text-mist">
                  Clear form
                </button>
              ) : null}
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <input value={editor.title} onChange={(event) => setEditor((current) => ({ ...current, title: event.target.value }))} placeholder="Video title" className="rounded-2xl bg-white/10 px-4 py-3" />
              <input value={editor.thumbnailUrl} onChange={(event) => setEditor((current) => ({ ...current, thumbnailUrl: event.target.value }))} placeholder="Thumbnail URL" className="rounded-2xl bg-white/10 px-4 py-3" />
              <select value={editor.type} onChange={(event) => setEditor((current) => ({ ...current, type: event.target.value as VideoType }))} className="rounded-2xl bg-white/10 px-4 py-3">
                <option value={VideoType.MOVIE}>Movie</option>
                <option value={VideoType.SERIES}>Series</option>
              </select>
              <select value={editor.accessTier} onChange={(event) => setEditor((current) => ({ ...current, accessTier: event.target.value as VideoAccessTier }))} className="rounded-2xl bg-white/10 px-4 py-3">
                <option value={VideoAccessTier.FREE}>Free</option>
                <option value={VideoAccessTier.PREMIUM}>Premium</option>
              </select>
              <select value={editor.visibility} onChange={(event) => setEditor((current) => ({ ...current, visibility: event.target.value as VideoVisibility }))} className="rounded-2xl bg-white/10 px-4 py-3">
                <option value={VideoVisibility.PUBLIC}>Public</option>
                <option value={VideoVisibility.PRIVATE}>Private</option>
                <option value={VideoVisibility.RESTRICTED}>Restricted</option>
              </select>
              <input
                type="number"
                min={1}
                value={editor.durationSeconds}
                onChange={(event) => setEditor((current) => ({ ...current, durationSeconds: Number(event.target.value) || 0 }))}
                placeholder="Duration in seconds"
                className="rounded-2xl bg-white/10 px-4 py-3"
              />
              <textarea
                value={editor.description}
                onChange={(event) => setEditor((current) => ({ ...current, description: event.target.value }))}
                placeholder="Short description"
                className="min-h-40 rounded-2xl bg-white/10 px-4 py-3 md:col-span-2"
              />
            </div>

            <button type="button" onClick={saveVideo} disabled={saving} className="mt-6 rounded-full bg-accent px-6 py-3 font-semibold text-ink disabled:opacity-60">
              {saving ? 'Saving...' : editor.id ? 'Save changes' : 'Create video'}
            </button>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-4xl">Current video library</h2>
                <p className="mt-3 text-sm text-mist/70">Pick a record to edit it, or delete the ones you no longer want to show.</p>
              </div>
              <span className="rounded-full border border-white/15 px-4 py-2 text-sm text-mist">{sortedVideos.length} records</span>
            </div>

            <div className="mt-6 space-y-4">
              {loading ? <p className="text-mist/70">Loading videos...</p> : null}
              {!loading && !sortedVideos.length ? <p className="text-mist/70">No videos yet. Create your first one using the form.</p> : null}
              {sortedVideos.map((video) => (
                <div key={video.id} className="rounded-2xl border border-white/10 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{video.title}</p>
                      <p className="mt-1 text-sm text-mist/70">{video.type} · {video.accessTier} · {video.visibility}</p>
                      <p className="mt-2 text-sm text-mist/70">{video.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditor({
                            id: video.id,
                            title: video.title,
                            description: video.description,
                            type: video.type,
                            accessTier: video.accessTier,
                            durationSeconds: video.durationSeconds,
                            thumbnailUrl: video.thumbnailUrl,
                            visibility: video.visibility
                          })
                        }
                        className="rounded-full border border-white/15 px-4 py-2 text-sm text-mist"
                      >
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteVideo(video)} className="rounded-full border border-red-400/30 px-4 py-2 text-sm text-red-200">
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {activeSection === 'users' && canManageUsers ? (
        <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
          <h2 className="font-display text-4xl">User access</h2>
          <p className="mt-3 text-sm text-mist/70">Change roles or temporarily block an account if needed.</p>
          <div className="mt-6 space-y-4">
            {loading ? <p className="text-mist/70">Loading users...</p> : null}
            {users.map((user) => (
              <UserRow key={user.id} user={user} onSave={saveUser} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function UserRow({
  user,
  onSave
}: {
  user: AdminUser;
  onSave: (user: AdminUser, nextRole: UserRole, isBanned: boolean) => Promise<void>;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [isBanned, setIsBanned] = useState(Boolean(user.isBanned));

  useEffect(() => {
    setRole(user.role);
    setIsBanned(Boolean(user.isBanned));
  }, [user]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 px-4 py-4">
      <div>
        <p className="font-medium text-white">{user.name ?? user.email}</p>
        <p className="text-sm text-mist/70">{user.email}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="rounded-full bg-white/10 px-4 py-2 text-sm">
          <option value={UserRole.USER}>User</option>
          <option value={UserRole.MODERATOR}>Moderator</option>
          <option value={UserRole.ADMIN}>Admin</option>
        </select>
        <label className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-mist">
          <input type="checkbox" checked={isBanned} onChange={(event) => setIsBanned(event.target.checked)} />
          Block account
        </label>
        <button type="button" onClick={() => void onSave(user, role, isBanned)} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-ink">
          Save
        </button>
      </div>
    </div>
  );
}
