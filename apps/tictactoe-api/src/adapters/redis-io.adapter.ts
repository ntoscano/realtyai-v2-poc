import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ServerOptions } from 'socket.io';

export class RedisIoAdapter extends IoAdapter {
	private adapterConstructor: ReturnType<typeof createAdapter>;

	async connectToRedis(): Promise<void> {
		const redisHost = process.env.REDIS_HOST || 'localhost';
		const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

		const pubClient = new Redis({ host: redisHost, port: redisPort });
		const subClient = pubClient.duplicate();

		this.adapterConstructor = createAdapter(pubClient, subClient);
	}

	createIOServer(port: number, options?: ServerOptions) {
		const server = super.createIOServer(port, {
			...options,
			adapter: this.adapterConstructor,
		});
		return server;
	}
}
