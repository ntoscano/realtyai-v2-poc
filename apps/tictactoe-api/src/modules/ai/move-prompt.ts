import { ChatPromptTemplate } from '@langchain/core/prompts';

const systemMessage = `You are playing Tic-Tac-Toe as player O. You must respond with ONLY a single digit (0-8) representing your chosen board position. No explanations, no extra text - just the number.

The board positions are numbered 0-8, left-to-right, top-to-bottom:
0 | 1 | 2
---------
3 | 4 | 5
---------
6 | 7 | 8`;

const userMessage = `Current board state:
{board_display}

Available positions: {available_positions}

Choose ONE position from the available positions. Respond with ONLY the number.`;

export const movePromptTemplate = ChatPromptTemplate.fromMessages([
	['system', systemMessage],
	['user', userMessage],
]);
