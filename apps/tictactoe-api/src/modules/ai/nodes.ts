import {
	formatBoardForDisplay,
	getAvailablePositions,
	getGameStatus,
	isValidMove,
} from '../../lib/game/gameLogic';
import type { MoveGraphStateType } from './graph-state';
import { llm } from './llm';
import { movePromptTemplate } from './move-prompt';
import {
	parseMoveFromReasoning,
	parseMoveResponse,
	validateMove,
} from './move-validator';

const MAX_GENERATION_ATTEMPTS = 3;

/**
 * Input validation node: validates the board state, computes available
 * positions, and formats the board display for the LLM prompt.
 */
export async function inputValidationNode(
	state: MoveGraphStateType,
): Promise<Partial<MoveGraphStateType>> {
	const { board } = state;

	// Validate game is still in progress
	const status = getGameStatus(board);
	if (status !== 'in_progress') {
		throw new Error(`Game is already over with status: ${status}`);
	}

	const available_positions = getAvailablePositions(board);
	if (available_positions.length === 0) {
		throw new Error('No available positions on the board');
	}

	const board_display = formatBoardForDisplay(board);

	return {
		available_positions,
		board_display,
	};
}

/**
 * Move generation node: invokes the LLM with up to 3 retries.
 * Includes error feedback on retry attempts.
 */
export async function moveGenerationNode(
	state: MoveGraphStateType,
): Promise<Partial<MoveGraphStateType>> {
	const { board_display, available_positions } = state;

	let lastErrors: string[] = [];

	for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
		try {
			// Build prompt with optional error feedback on retries
			let extraContext = '';
			if (attempt > 1 && lastErrors.length > 0) {
				const errorList = lastErrors.map((e) => `- ${e}`).join('\n');
				extraContext =
					`\n\nIMPORTANT: Your previous response was invalid:\n` +
					`${errorList}\n` +
					`You MUST respond with ONLY a single digit from: ${available_positions.join(
						', ',
					)}`;
			}

			const formattedPrompt = await movePromptTemplate.format({
				board_display: board_display + extraContext,
				available_positions: available_positions.join(', '),
			});

			const response = await llm.invoke(formattedPrompt);

			// Extract text content from response
			// DeepSeek-R1 via Bedrock returns reasoning_content blocks and text blocks
			let responseText = '';
			let reasoningText = '';

			if (typeof response.content === 'string') {
				responseText = response.content;
			} else if (Array.isArray(response.content)) {
				for (const block of response.content) {
					if (typeof block === 'object' && block !== null) {
						if ('text' in block) {
							responseText += (block as { text: string }).text;
						}
						if (
							'reasoningText' in block &&
							typeof (block as Record<string, unknown>).reasoningText ===
								'object'
						) {
							const rt = (
								block as unknown as { reasoningText: { text: string } }
							).reasoningText;
							if (rt && 'text' in rt) {
								reasoningText += rt.text;
							}
						}
					}
				}
			}

			// Parse the response — try the main text first, fall back to reasoning text
			// DeepSeek-R1 may put its answer at the end of reasoning if maxTokens runs short
			let position = parseMoveResponse(responseText);
			if (position === null && reasoningText) {
				position = parseMoveFromReasoning(reasoningText, available_positions);
			}

			if (position === null) {
				lastErrors = [
					`Could not parse a valid position (0-8) from response: "${responseText.slice(
						0,
						100,
					)}"`,
				];
				console.warn(
					`[moveGenerationNode] Attempt ${attempt}: failed to parse response`,
				);
				continue;
			}

			// Validate the parsed position
			const validation = validateMove(position, available_positions);

			if (validation.success) {
				console.log(
					`[moveGenerationNode] Success on attempt ${attempt}: position ${position}`,
				);
				return { ai_move: position };
			}

			lastErrors = validation.errors;
			console.warn(
				`[moveGenerationNode] Attempt ${attempt} failed validation:`,
				validation.errors,
			);
		} catch (error: unknown) {
			const errMessage = error instanceof Error ? error.message : String(error);
			console.error(
				`[moveGenerationNode] LLM invocation failed: ${errMessage}`,
			);
			throw new Error(`LLM generation failed: ${errMessage}`);
		}
	}

	throw new Error(
		`AI move generation failed after ${MAX_GENERATION_ATTEMPTS} attempts. ` +
			`Last errors: ${lastErrors.join(', ')}`,
	);
}

/**
 * Move validation node: final legality check on the AI's chosen move.
 */
export async function moveValidationNode(
	state: MoveGraphStateType,
): Promise<Partial<MoveGraphStateType>> {
	const { board, ai_move } = state;

	if (ai_move === null) {
		throw new Error('No AI move was generated');
	}

	if (!isValidMove(board, ai_move)) {
		throw new Error(
			`AI generated invalid move: position ${ai_move} is not available`,
		);
	}

	return {};
}
