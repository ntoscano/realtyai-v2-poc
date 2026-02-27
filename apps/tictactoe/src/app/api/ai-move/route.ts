import { moveGraph } from '@/lib/ai/moveGraph';
import { applyMove, getGameStatus, isValidMove } from '@/lib/game/gameLogic';
import { Board, CellValue } from '@/types/game';
import { NextRequest, NextResponse } from 'next/server';

function isValidCellValue(value: unknown): value is CellValue {
	return value === null || value === 'X' || value === 'O';
}

function isValidBoard(board: unknown): board is Board {
	return (
		Array.isArray(board) && board.length === 9 && board.every(isValidCellValue)
	);
}

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { board } = body;

		if (!isValidBoard(board)) {
			return NextResponse.json(
				{
					error:
						'Invalid board: must be a 9-element array of null, "X", or "O"',
				},
				{ status: 400 },
			);
		}

		const status = getGameStatus(board);
		if (status !== 'in_progress') {
			return NextResponse.json(
				{ error: `Game is already over with status: ${status}` },
				{ status: 400 },
			);
		}

		const result = await moveGraph.invoke({ board });

		if (result.ai_move === null || result.ai_move === undefined) {
			return NextResponse.json(
				{ error: 'AI failed to generate a valid move after retries' },
				{ status: 500 },
			);
		}

		const position = result.ai_move;

		// Defense in depth: double-check the move is valid
		if (!isValidMove(board, position)) {
			return NextResponse.json(
				{ error: 'AI returned an invalid move position' },
				{ status: 500 },
			);
		}

		const updatedBoard = applyMove(board, position, 'O');

		return NextResponse.json({ position, board: updatedBoard });
	} catch (error) {
		console.error('Error generating AI move:', error);

		if (error instanceof SyntaxError) {
			return NextResponse.json(
				{ error: 'Invalid JSON in request body' },
				{ status: 400 },
			);
		}

		const message = error instanceof Error ? error.message : 'Unknown error';
		return NextResponse.json(
			{ error: `AI move generation failed: ${message}` },
			{ status: 500 },
		);
	}
}
