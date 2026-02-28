import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';

import {
	applyMove,
	getGameStatus,
	isValidMove,
} from '../../lib/game/gameLogic';
import { Board } from '../../lib/game/types';
import { CreateGameDto } from './dto/create-game.dto';
import { CreateGameResponseDto, GameStateDto } from './dto/game-state.dto';
import { Game } from './game.entity';

@Injectable()
export class GameService {
	constructor(
		@InjectRepository(Game)
		private readonly gameRepository: Repository<Game>,
		private readonly dataSource: DataSource,
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

	async listGames(limit = 20): Promise<GameStateDto[]> {
		const games = await this.gameRepository.find({
			order: { createdAt: 'DESC' },
			take: limit,
		});

		return games.map((game) => this.toGameStateDto(game));
	}

	async getGame(id: string): Promise<GameStateDto> {
		const game = await this.gameRepository.findOne({ where: { id } });

		if (!game) {
			throw new NotFoundException(`Game with ID "${id}" not found`);
		}

		return this.toGameStateDto(game);
	}

	async joinGame(id: string): Promise<CreateGameResponseDto> {
		const game = await this.gameRepository.findOne({ where: { id } });

		if (!game) {
			throw new NotFoundException(`Game with ID "${id}" not found`);
		}

		if (game.mode !== 'pvp') {
			throw new BadRequestException('Only PvP games can be joined');
		}

		if (game.playerOToken) {
			throw new ConflictException('Player O has already joined this game');
		}

		const playerOToken = randomUUID();
		game.playerOToken = playerOToken;
		await this.gameRepository.save(game);

		return {
			game: this.toGameStateDto(game),
			playerToken: playerOToken,
		};
	}

	async makeMove(id: string, position: number): Promise<GameStateDto> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			const game = await queryRunner.manager
				.getRepository(Game)
				.createQueryBuilder('game')
				.setLock('pessimistic_write')
				.where('game.id = :id', { id })
				.getOne();

			if (!game) {
				throw new NotFoundException(`Game with ID "${id}" not found`);
			}

			if (game.status !== 'in_progress') {
				throw new BadRequestException('Game is not in progress');
			}

			const board = game.boardState as Board;

			if (!isValidMove(board, position)) {
				throw new BadRequestException(
					`Invalid move: position ${position} is not available`,
				);
			}

			const newBoard = applyMove(board, position, game.currentTurn);
			const moveNumber = game.moves.length + 1;

			game.boardState = newBoard;
			game.moves = [
				...game.moves,
				{ position, player: game.currentTurn, moveNumber },
			];

			const status = getGameStatus(newBoard);
			game.status = status;

			if (status === 'x_wins') {
				game.winner = 'X';
			} else if (status === 'o_wins') {
				game.winner = 'O';
			} else if (status === 'draw') {
				game.winner = null;
			} else {
				game.currentTurn = game.currentTurn === 'X' ? 'O' : 'X';
			}

			await queryRunner.manager.save(game);
			await queryRunner.commitTransaction();

			return this.toGameStateDto(game);
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
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
