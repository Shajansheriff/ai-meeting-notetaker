import { Queue, Worker, type Job, type WorkerOptions } from 'bullmq';
import type { Redis } from 'ioredis';

// 1. The Strict Contract
export interface TranscriptionPayload {
  meetingId: string;
  s3Url: string;
  fileName: string;
}

const QUEUE_NAME = 'meeting_transcription';

// 2. The Producer Factory (For your Fastify API later)
export const createTranscriptionQueue = (connection: Redis) => {
  const queue = new Queue<TranscriptionPayload>(QUEUE_NAME, {
    connection,
    defaultJobOptions: { 
      attempts: 5, 
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true, 
      removeOnFail: false // Keep failed jobs in Redis for inspection (DLQ)
    }
  });

  const enqueueTranscription = async (payload: TranscriptionPayload) => {
    return queue.add('process-audio', payload);
  };

  return { queue, enqueueTranscription };
};

// 3. The Consumer Factory (For your Worker App)
export type TranscriptionProcessor = (job: Job<TranscriptionPayload>) => Promise<void>;

export const createTranscriptionWorker = (
  connection: Redis, 
  processor: TranscriptionProcessor,
  options?: Partial<WorkerOptions>
) => {
  const worker = new Worker<TranscriptionPayload>(
    QUEUE_NAME, 
    processor, 
    { 
      connection, 
      concurrency: 5, // Process 5 audio files simultaneously per machine
      ...options 
    }
  );

  return worker;
};