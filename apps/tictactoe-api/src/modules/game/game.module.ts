import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiModule } from '../ai/ai.module';
import { GameController } from './game.controller';
import { Game } from './game.entity';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';

@Module({
	imports: [TypeOrmModule.forFeature([Game]), AiModule],
	controllers: [GameController],
	providers: [GameService, GameGateway],
	exports: [GameService],
})
export class GameModule {}
