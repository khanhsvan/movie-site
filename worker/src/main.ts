import 'reflect-metadata';
import { createTranscodeWorker } from './jobs/transcode.job';

const worker = createTranscodeWorker({
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT ?? 6379)
});

worker.on('completed', (job, result) => {
  console.log('Transcode job completed', job.id, result);
});

worker.on('failed', (job, error) => {
  console.error('Transcode job failed', job?.id, error);
});

console.log('Worker listening for transcode jobs');

