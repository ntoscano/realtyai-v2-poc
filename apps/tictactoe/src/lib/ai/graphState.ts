import type { Board } from '@/types/game';
import { Annotation } from '@langchain/langgraph';

/**
 * LangGraph state annotation for the AI move generation pipeline.
 *
 * Fields:
 * - board: Current board state (9-element array of CellValue)
 * - available_positions: Valid positions the AI can play
 * - board_display: Text representation of the board for the LLM prompt
 * - ai_move: The AI's chosen position (output)
 */
export const MoveGraphState = Annotation.Root({
	board: Annotation<Board>({
		reducer: (_, newVal) => newVal,
		default: () => [null, null, null, null, null, null, null, null, null],
	}),
	available_positions: Annotation<number[]>({
		reducer: (_, newVal) => newVal,
		default: () => [],
	}),
	board_display: Annotation<string>({
		reducer: (_, newVal) => newVal,
		default: () => '',
	}),
	ai_move: Annotation<number | null>({
		reducer: (_, newVal) => newVal,
		default: () => null,
	}),
});

export type MoveGraphStateType = typeof MoveGraphState.State;
