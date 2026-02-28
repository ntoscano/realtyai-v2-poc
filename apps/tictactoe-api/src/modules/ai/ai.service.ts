import { Injectable } from '@nestjs/common';
import { isValidMove } from '../../lib/game/gameLogic';
import type { Board } from '../../lib/game/types';
import { moveGraph } from './move-graph';

@Injectable()
export class AiService {
	/**
	 * Generates an AI move for the given board state using the LangGraph pipeline.
	 * Includes a defense-in-depth isValidMove check after generation.
	 *
	 * @param board - Current board state
	 * @returns The position (0-8) chosen by the AI
	 */
	async generateMove(board: Board): Promise<number> {
		const result = await moveGraph.invoke({ board });

		const position = result.ai_move;

		if (position === null || position === undefined) {
			throw new Error('AI pipeline returned no move');
		}

		// Defense-in-depth: verify the AI's chosen position is actually valid
		if (!isValidMove(board, position)) {
			throw new Error(
				`AI pipeline returned invalid position ${position} — position is not available on the board`,
			);
		}

		return position;
	}
}
