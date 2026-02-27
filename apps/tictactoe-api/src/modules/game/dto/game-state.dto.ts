import { CellValue, GameMode, GameMove, GameStatus } from '../game.entity';

export class GameStateDto {
	id: string;
	board: CellValue[];
	status: GameStatus;
	winner: string | null;
	moves: GameMove[];
	mode: GameMode;
	currentTurn: 'X' | 'O';
	createdAt: Date;
	updatedAt: Date;
}

export class CreateGameResponseDto {
	game: GameStateDto;
	playerToken: string;
}
