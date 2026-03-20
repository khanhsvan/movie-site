import { Job, Worker } from 'bullmq';
import { FfmpegService } from '../services/ffmpeg.service';

const ffmpegService = new FfmpegService();

type TranscodePayload = {
  videoId: string;
  sourceObjectKey: string;
  previewDurationSeconds: number;
};

async function processTranscode(job: Job<TranscodePayload>) {
  const command = ffmpegService.buildCommand(`/tmp/${job.data.videoId}.mp4`, `/tmp/${job.data.videoId}`);
  const storageBaseUrl = process.env.STORAGE_BASE_URL ?? 'http://127.0.0.1:8081';

  return {
    videoId: job.data.videoId,
    sourceObjectKey: job.data.sourceObjectKey,
    previewDurationSeconds: job.data.previewDurationSeconds,
    commandPreview: command,
    storageUploadTarget: `${storageBaseUrl}/videos/${job.data.videoId}/`,
    masterPlaylistPath: `${storageBaseUrl}/videos/${job.data.videoId}/index.m3u8`,
    previewPlaylistPath: `${storageBaseUrl}/videos/${job.data.videoId}/preview.m3u8`
  };
}

export function createTranscodeWorker(connection: { host: string; port: number }) {
  return new Worker<TranscodePayload>('video-transcode', processTranscode, { connection });
}
