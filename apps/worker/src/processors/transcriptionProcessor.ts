import { UnrecoverableError, type Job } from 'bullmq';
import type { TranscriptionPayload } from '@repo/mq';
import { MockWhisperAI } from '../mocks/whisper';

export const processTranscription = async (job: Job<TranscriptionPayload>): Promise<void> => {
  const { meetingId, s3Url, fileName } = job.data;
  
  console.log(`\n⚙️  [Processing] Meeting ${meetingId} (File: ${fileName})`);

  try {
    // 1. Execute the heavy lifting
    const transcript = await MockWhisperAI.transcribe(s3Url);
    
    // 2. In reality, you would save this to Postgres here
    console.log(`✅  [Success] Transcribed Meeting ${meetingId}. Saved to DB.`);
    
    // 3. Optionally trigger the next pipeline step (e.g., Summary Generation)
    
  } catch (error: any) {
    console.error(`❌  [Failed] Meeting ${meetingId}: ${error.message}`);
    
    // Poison Pill Handling: Stop retrying if the file is completely broken
    if (error.message.includes('UNRECOVERABLE')) {
      throw new UnrecoverableError(`Cannot process audio format. Original error: ${error.message}`);
    }
    
    // Throw standard errors so BullMQ automatically triggers the exponential backoff
    throw error;
  }
};