import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';

import { CreateGameDto } from './dto/create-game.dto';
import { CreateGameResponseDto, GameStateDto } from './dto/game-state.dto';
import { Game } from './game.entity';

@Injectable()
export class GameService {
	constructor(
		@InjectRepository(Game)
		private readonly gameRepository: Repository<Game>,
	) {}

	async createGame(dto: CreateGameDto): Promise<CreateGameResponseDto> {
		const playerXToken = randomUUID();

		const game = this.gameRepository.create({
			boardState: [null, null, null, null, null, null, null, null, null],
			status: 'in_progress',
			winner: null,
			moves: [],
			mode: dto.mode,
			currentTurn: 'X',
			playerXToken,
			playerOToken: null,
		});

		const saved = await this.gameRepository.save(game);

		return {
			game: this.toGameStateDto(saved),
			playerToken: playerXToken,
		};
	}

	async getGame(id: string): Promise<GameStateDto> {
		const game = await this.gameRepository.findOne({ where: { id } });

		if (!game) {
			throw new NotFoundException(`Game with ID "${id}" not found`);
		}

		return this.toGameStateDto(game);
	}

	private toGameStateDto(game: Game): GameStateDto {
		return {
			id: game.id,
			board: game.boardState,
			status: game.status,
			winner: game.winner,
			moves: game.moves,
			mode: game.mode,
			currentTurn: game.currentTurn,
			createdAt: game.createdAt,
			updatedAt: game.updatedAt,
		};
	}
}
