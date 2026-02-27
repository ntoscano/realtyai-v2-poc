import { END, START, StateGraph } from '@langchain/langgraph';
import { MoveGraphState } from './graphState';
import {
	inputValidationNode,
	moveGenerationNode,
	moveValidationNode,
} from './nodes';

/**
 * AI move generation LangGraph pipeline.
 *
 * Pipeline flow:
 * START -> inputValidation -> moveGeneration -> moveValidation -> END
 *
 * 1. inputValidation: Validates board, computes available positions, formats display
 * 2. moveGeneration: Invokes LLM with retries to get a valid move
 * 3. moveValidation: Final legality check on the chosen move
 */
const moveGraphBuilder = new StateGraph(MoveGraphState)
	.addNode('inputValidation', inputValidationNode)
	.addNode('moveGeneration', moveGenerationNode)
	.addNode('moveValidation', moveValidationNode)
	.addEdge(START, 'inputValidation')
	.addEdge('inputValidation', 'moveGeneration')
	.addEdge('moveGeneration', 'moveValidation')
	.addEdge('moveValidation', END);

/**
 * Compiled move generation graph.
 * Invoke with: moveGraph.invoke({ board })
 */
export const moveGraph = moveGraphBuilder.compile();
