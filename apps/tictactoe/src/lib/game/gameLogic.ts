import { Board, CellValue, GameStatus } from '@/types/game';

export const WIN_LINES: readonly [number, number, number][] = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8],
	[0, 4, 8],
	[2, 4, 6],
];

export function checkWinner(board: Board): CellValue {
	for (const [a, b, c] of WIN_LINES) {
		if (board[a] && board[a] === board[b] && board[a] === board[c]) {
			return board[a];
		}
	}
	return null;
}

export function isBoardFull(board: Board): boolean {
	return board.every((cell) => cell !== null);
}

export function getAvailablePositions(board: Board): number[] {
	return board.reduce<number[]>((positions, cell, index) => {
		if (cell === null) {
			positions.push(index);
		}
		return positions;
	}, []);
}

export function getGameStatus(board: Board): GameStatus {
	const winner = checkWinner(board);
	if (winner === 'X') return 'x_wins';
	if (winner === 'O') return 'o_wins';
	if (isBoardFull(board)) return 'draw';
	return 'in_progress';
}

export function getCurrentTurn(board: Board): 'X' | 'O' {
	const xCount = board.filter((cell) => cell === 'X').length;
	const oCount = board.filter((cell) => cell === 'O').length;
	return xCount <= oCount ? 'X' : 'O';
}

export function isValidMove(board: Board, position: number): boolean {
	return position >= 0 && position < 9 && board[position] === null;
}

export function applyMove(
	board: Board,
	position: number,
	player: 'X' | 'O',
): Board {
	const newBoard = [...board] as Board;
	newBoard[position] = player;
	return newBoard;
}

export function createEmptyBoard(): Board {
	return [null, null, null, null, null, null, null, null, null];
}

export function formatBoardForDisplay(board: Board): string {
	const symbol = (cell: CellValue) => (cell === null ? '.' : cell);
	return [
		`${symbol(board[0])} ${symbol(board[1])} ${symbol(board[2])}`,
		`${symbol(board[3])} ${symbol(board[4])} ${symbol(board[5])}`,
		`${symbol(board[6])} ${symbol(board[7])} ${symbol(board[8])}`,
	].join('\n');
}
