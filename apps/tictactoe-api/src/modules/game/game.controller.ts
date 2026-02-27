import { Body, Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';

import { CreateGameDto } from './dto/create-game.dto';
import { CreateGameResponseDto } from './dto/game-state.dto';
import { GameService } from './game.service';

@Controller('api/games')
export class GameController {
	constructor(private readonly gameService: GameService) {}

	@Post()
	@UsePipes(new ValidationPipe({ whitelist: true }))
	async createGame(@Body() dto: CreateGameDto): Promise<CreateGameResponseDto> {
		return this.gameService.createGame(dto);
	}
}
