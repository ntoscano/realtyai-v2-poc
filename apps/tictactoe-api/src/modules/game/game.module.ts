import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AiModule } from '../ai/ai.module';
import { GameController } from './game.controller';
import { Game } from './game.entity';
import { GameService } from './game.service';

@Module({
	imports: [TypeOrmModule.forFeature([Game]), AiModule],
	controllers: [GameController],
	providers: [GameService],
	exports: [GameService],
})
export class GameModule {}
