import Fastify from 'fastify';
import { Redis } from 'ioredis';
import { meetingRoutes } from './routes/meetings.js';

const startApiServer = async () => {
  // 1. Initialize Fastify with structured JSON logging
  const server = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty', // Makes logs readable for local development
        options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
      }
    }
  });

  // 2. Establish the Redis Connection
  const redisConnection = new Redis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null,
  });

  redisConnection.on('error', (err) => {
    server.log.error({ err }, 'Redis connection error');
  });

  redisConnection.on('reconnecting', () => {
    server.log.warn('Redis reconnecting...');
  });

  try {
    await redisConnection.ping();
    server.log.info('Redis connected');
  } catch (err) {
    server.log.fatal({ err }, 'Failed to connect to Redis');
    redisConnection.disconnect();
    process.exit(1);
  }

  // 3. Register our routes and inject the Redis dependency
  server.register(meetingRoutes(redisConnection), { prefix: '/api/v1/meetings' });

  // 4. Graceful Shutdown Protocol
  const shutdown = async () => {
    server.log.info('🛑 Shutting down API server...');
    try {
      await server.close();
      await redisConnection.quit();
      server.log.info('👋 API server fully shut down.');
      process.exit(0);
    } catch (err) {
      server.log.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // 5. Start listening for incoming internet traffic
  try {
    await server.listen({ port: 3000, host: '0.0.0.0' });
    server.log.info(`🚀 API Gateway active. Listening on Port 3000`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

startApiServer().catch((err) => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});