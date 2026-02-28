import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	InternalServerErrorException,
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
import { AiService } from '../ai/ai.service';
import { CreateGameDto } from './dto/create-game.dto';
import { CreateGameResponseDto, GameStateDto } from './dto/game-state.dto';
import { Game } from './game.entity';
import { GameGateway } from './game.gateway';

@Injectable()
export class GameService {
	constructor(
		@InjectRepository(Game)
		private readonly gameRepository: Repository<Game>,
		private readonly dataSource: DataSource,
		private readonly aiService: AiService,
		private readonly gameGateway: GameGateway,
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

	async makeMove(
		id: string,
		position: number,
		playerToken?: string,
	): Promise<GameStateDto> {
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

			// Validate player token in PvP mode
			if (game.mode === 'pvp') {
				if (!playerToken) {
					throw new ForbiddenException(
						'X-Player-Token header is required for PvP games',
					);
				}

				const expectedToken =
					game.currentTurn === 'X'
						? game.playerXToken
						: game.playerOToken;

				if (playerToken !== expectedToken) {
					throw new ForbiddenException(
						'Invalid player token for the current turn',
					);
				}
			}

			const board = game.boardState as Board;

			if (!isValidMove(board, position)) {
				throw new BadRequestException(
					`Invalid move: position ${position} is not available`,
				);
			}

			// Apply human move
			let currentBoard = applyMove(board, position, game.currentTurn);
			const humanMoveNumber = game.moves.length + 1;

			game.boardState = currentBoard;
			game.moves = [
				...game.moves,
				{ position, player: game.currentTurn, moveNumber: humanMoveNumber },
			];

			let status = getGameStatus(currentBoard);
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

			// In AI mode, if game is still in progress after human move, trigger AI counter-move
			if (game.mode === 'ai' && game.status === 'in_progress') {
				let aiPosition: number;
				try {
					aiPosition = await this.aiService.generateMove(
						currentBoard as Board,
					);
				} catch {
					throw new InternalServerErrorException(
						'AI pipeline failed to generate a move. Please try again.',
					);
				}

				currentBoard = applyMove(currentBoard as Board, aiPosition, 'O');
				const aiMoveNumber = game.moves.length + 1;

				game.boardState = currentBoard;
				game.moves = [
					...game.moves,
					{ position: aiPosition, player: 'O', moveNumber: aiMoveNumber },
				];

				status = getGameStatus(currentBoard);
				game.status = status;

				if (status === 'o_wins') {
					game.winner = 'O';
				} else if (status === 'draw') {
					game.winner = null;
				} else {
					// Game continues — turn flips back to X
					game.currentTurn = 'X';
				}
			}

			await queryRunner.manager.save(game);
			await queryRunner.commitTransaction();

			const gameState = this.toGameStateDto(game);

			// Broadcast update to PvP game room
			if (game.mode === 'pvp') {
				this.gameGateway.broadcastGameUpdate(id, gameState);
			}

			return gameState;
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
