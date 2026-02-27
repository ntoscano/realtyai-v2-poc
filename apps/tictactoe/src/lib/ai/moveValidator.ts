import { z } from 'zod';

/**
 * Creates a Zod schema that validates a move position is an integer 0-8
 * and is in the list of available positions.
 */
export function createMoveSchema(availablePositions: number[]) {
	return z
		.number()
		.int()
		.min(0)
		.max(8)
		.refine((pos) => availablePositions.includes(pos), {
			message: `Position is not available. Available: ${availablePositions.join(
				', ',
			)}`,
		});
}

/**
 * Strips DeepSeek-R1 <think>...</think> reasoning tags and extracts
 * the first digit 0-8 from the response.
 */
export function parseMoveResponse(response: string): number | null {
	// Strip <think>...</think> tags (including multiline content)
	const stripped = response.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

	// Extract first digit 0-8
	const match = stripped.match(/[0-8]/);
	if (!match) {
		return null;
	}

	return parseInt(match[0], 10);
}

export type MoveValidationResult =
	| { success: true; position: number }
	| { success: false; errors: string[] };

/**
 * Validates a parsed move position against available positions.
 */
export function validateMove(
	position: number,
	availablePositions: number[],
): MoveValidationResult {
	const schema = createMoveSchema(availablePositions);
	const result = schema.safeParse(position);

	if (result.success) {
		return { success: true, position: result.data };
	}

	const errors = result.error.issues.map((e) => e.message);
	return { success: false, errors };
}
