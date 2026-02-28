import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';

import { CreateGameDto } from './dto/create-game.dto';
import { CreateGameResponseDto, GameStateDto } from './dto/game-state.dto';
import { MakeMoveDto } from './dto/make-move.dto';
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
	@UsePipes(new ValidationPipe({ whitelist: true }))
	async makeMove(
		@Param('id') id: string,
		@Body() dto: MakeMoveDto,
	): Promise<GameStateDto> {
		return this.gameService.makeMove(id, dto.position);
	}
}
