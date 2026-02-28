import {
	Body,
	Controller,
	Get,
	Param,
	Post,
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

	@Get(':id')
	async getGame(@Param('id') id: string): Promise<GameStateDto> {
		return this.gameService.getGame(id);
	}
}
