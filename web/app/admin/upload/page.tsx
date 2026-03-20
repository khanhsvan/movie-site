import { AppShell } from '../../../components/app-shell';
import { AdminUploadForm } from '../../../components/admin-upload-form';
import { EpisodeManager } from '../../../components/episode-manager';

export default function AdminUploadPage() {
  return (
    <AppShell>
      <div className="space-y-8">
        <section className="space-y-4">
          <h1 className="font-display text-5xl">Upload and manage content</h1>
          <p className="max-w-3xl text-lg text-mist/80">
            Add full titles here, then use the series tools below to build out episode-based content in a more user-friendly way for non-technical staff.
          </p>
        </section>
        <AdminUploadForm />
        <EpisodeManager />
      </div>
    </AppShell>
  );
}
