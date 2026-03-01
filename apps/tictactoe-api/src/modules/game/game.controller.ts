import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Headers,
	Param,
	Post,
	Query,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { CreateGameDto } from './dto/create-game.dto';
import { CreateGameResponseDto, GameStateDto } from './dto/game-state.dto';
import { GameService } from './game.service';

@Controller('api/games')
export class GameController {
	constructor(private readonly gameService: GameService) {}

	@Post()
	@UsePipes(new ValidationPipe({ whitelist: true }))
	async createGame(@Body() dto: CreateGameDto): Promise<CreateGameResponseDto> {
		return this.gameService.createGame(dto);
	}

	@Get()
	async listGames(@Query('limit') limit?: string): Promise<GameStateDto[]> {
		const parsedLimit = limit ? parseInt(limit, 10) : undefined;
		return this.gameService.listGames(
			parsedLimit && !isNaN(parsedLimit) ? parsedLimit : undefined,
		);
	}

	@Get(':id')
	async getGame(@Param('id') id: string): Promise<GameStateDto> {
		return this.gameService.getGame(id);
	}

	@Post(':id/join')
	async joinGame(
		@Param('id') id: string,
	): Promise<CreateGameResponseDto> {
		return this.gameService.joinGame(id);
	}

	@Post(':id/move')
	async makeMove(
		@Param('id') id: string,
		@Body() body: { position: number },
		@Headers('x-player-token') playerToken?: string,
	): Promise<GameStateDto> {
		const position = Number(body.position);
		if (!Number.isInteger(position) || position < 0 || position > 8) {
			throw new BadRequestException(
				'position must be an integer between 0 and 8',
			);
		}
		return this.gameService.makeMove(id, position, playerToken);
	}
}
