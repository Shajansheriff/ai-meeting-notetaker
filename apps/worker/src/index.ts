import { Redis } from 'ioredis';
import { createTranscriptionWorker } from '@repo/mq';
import { processTranscription } from './processors/transcriptionProcessor';

const startWorkerSystem = async () => {
  console.log('🚀 Booting up Worker Engine...');

  // 1. Establish the dedicated Redis connection
  const redisConnection = new Redis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null,
  });

  // 2. Initialize the domain workers using our factory
  const transcriptionWorker = createTranscriptionWorker(
    redisConnection, 
    processTranscription
  );

  // 3. Attach global observability hooks
  transcriptionWorker.on('failed', (job, err) => {
    // This is where you would send an alert to Sentry or Datadog
    console.log(`[DLQ Alert] Job ${job?.id} failed in ${job?.queueName}. Reason: ${err.message}`);
  });

  transcriptionWorker.on('ready', () => {
    console.log('🎧 Transcription Worker listening for jobs...');
  });

  // 4. Graceful Shutdown (Critical for Production)
  const shutdown = async () => {
    console.log('\n🛑 SIGTERM received. Shutting down worker gracefully...');
    await transcriptionWorker.close();
    await redisConnection.quit();
    console.log('👋 Worker fully shut down.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startWorkerSystem().catch(console.error);