import type { FastifyInstance } from 'fastify';
import type { FastifyPluginAsync } from 'fastify';
import { createTranscriptionQueue } from '@repo/mq';
import type { Redis } from 'ioredis';
import crypto from 'crypto';

// The dependency injection wrapper
export const meetingRoutes = (redisConnection: Redis): FastifyPluginAsync => {
  
  return async (fastify: FastifyInstance) => {
    // 1. Initialize the queue client using our shared factory
    const { enqueueTranscription } = createTranscriptionQueue(redisConnection);

    // 2. Define the route and schema
    fastify.post('/upload', {
      schema: {
        body: {
          type: 'object',
          required: ['meetingTitle', 'fileName'],
          properties: {
            meetingTitle: { type: 'string', minLength: 3 },
            fileName: { type: 'string', pattern: '\\.(mp3|wav|m4a)$' }
          }
        }
      }
    }, async (request, reply) => {
      // Fastify guarantees this data is perfectly shaped because of the schema above
      const { meetingTitle, fileName } = request.body as { meetingTitle: string, fileName: string };

      // 3. Generate internal tracking IDs and Mock S3 URLs
      const meetingId = crypto.randomUUID();
      const mockS3Url = `http://localhost:9000/vox-uploads/${meetingId}-${fileName}`;

      request.log.info({ meetingId, fileName }, 'Received upload intent. Queueing transcription...');

      // 4. Fire the event into the BullMQ pipeline
      const job = await enqueueTranscription({
        meetingId,
        s3Url: mockS3Url,
        fileName
      });

      // 5. Instantly return a 202 Accepted (Do not wait for Whisper!)
      return reply.code(202).send({
        status: 'accepted',
        message: 'Meeting securely queued for transcription processing.',
        data: {
          meetingId,
          jobId: job.id,
          uploadUrl: mockS3Url // The client uses this to upload to S3
        }
      });
    });
  };
};