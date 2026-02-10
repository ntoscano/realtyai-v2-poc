import { NestApplicationOptions } from '@nestjs/common';

export function getNestConfig(): NestApplicationOptions {
	return {
		cors: {
			origin: process.env.CORS_ORIGIN || '*',
			credentials: true,
		},
		logger: process.env.NODE_ENV === 'production'
			? ['error', 'warn']
			: ['log', 'error', 'warn', 'debug', 'verbose'],
	};
}

export function getAppPort(): number {
	return parseInt(process.env.PORT || '3001', 10);
}
