import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file for local development
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
	const port = process.env.PORT || 3004;
	const app = await NestFactory.create(AppModule);
	app.enableCors();
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);

	await app.listen(port);
	console.log(`Midi API is running on: http://localhost:${port}`);
}

bootstrap();
