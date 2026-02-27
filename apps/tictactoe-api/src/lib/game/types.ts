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

export type GameMode = 'ai' | 'pvp';
