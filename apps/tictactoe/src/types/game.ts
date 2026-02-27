export type CellValue = 'X' | 'O' | null;

export type Board = [
	CellValue,
	CellValue,
	CellValue,
	CellValue,
	CellValue,
	CellValue,
	CellValue,
	CellValue,
	CellValue,
];

export interface GameMove {
	position: number;
	player: 'X' | 'O';
	moveNumber: number;
}

export type GameStatus = 'in_progress' | 'x_wins' | 'o_wins' | 'draw';

export interface GameState {
	id: string | null;
	board: Board;
	status: GameStatus;
	winner: CellValue;
	moves: GameMove[];
	isAiThinking: boolean;
}

export interface GameSummary {
	id: string;
	status: GameStatus;
	winner: CellValue;
	moveCount: number;
	createdAt: string;
}
