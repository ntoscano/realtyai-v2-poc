import {
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { GameStateDto } from './dto/game-state.dto';

@WebSocketGateway({
	namespace: '/game',
	cors: { origin: '*' },
})
export class GameGateway {
	@WebSocketServer()
	server: Server;

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
