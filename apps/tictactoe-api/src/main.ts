import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file for local development
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Remove stale bearer token that overrides SigV4 auth for Bedrock
delete process.env.AWS_BEARER_TOKEN_BEDROCK;

import { NestFactory } from '@nestjs/core';
import { RedisIoAdapter } from './adapters/redis-io.adapter';
import { AppModule } from './app.module';

async function bootstrap() {
	const port = process.env.PORT || 3002;
	const app = await NestFactory.create(AppModule);
	app.enableCors();

	const redisIoAdapter = new RedisIoAdapter(app);
	await redisIoAdapter.connectToRedis();
	app.useWebSocketAdapter(redisIoAdapter);

	await app.listen(port);
	console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
