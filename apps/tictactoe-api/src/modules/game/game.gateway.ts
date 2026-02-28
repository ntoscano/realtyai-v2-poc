import {
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Server, Socket } from 'socket.io';

import { GameStateDto } from './dto/game-state.dto';

@WebSocketGateway({
	namespace: '/game',
	cors: { origin: '*' },
})
export class GameGateway implements OnGatewayInit {
	@WebSocketServer()
	server: Server;

	afterInit(server: Server) {
		const redisHost = process.env.REDIS_HOST || 'localhost';
		const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

		const pubClient = new Redis({ host: redisHost, port: redisPort });
		const subClient = pubClient.duplicate();

		server.adapter(createAdapter(pubClient, subClient));
	}

	@SubscribeMessage('joinGame')
	handleJoinGame(client: Socket, data: { gameId: string }) {
		const room = `game-${data.gameId}`;
		client.join(room);
	}

	broadcastGameUpdate(gameId: string, state: GameStateDto) {
		const room = `game-${gameId}`;
		this.server.to(room).emit('gameUpdate', state);
	}
}
