import { END, START, StateGraph } from '@langchain/langgraph';
import { EmailGraphState } from './graphState';
import {
	contextRetrievalNode,
	generationNode,
	inputNormalizationNode,
	postProcessingNode,
	promptAssemblyNode,
	weatherFetchNode,
} from './nodes';

/**
 * Email generation LangGraph pipeline.
 *
 * Pipeline flow:
 * START -> inputNormalization -> weatherFetch -> contextRetrieval
 *       -> promptAssembly -> generation -> postProcessing -> END
 *
 * This graph orchestrates the email generation process:
 * 1. Input normalization: Validates and normalizes inputs
 * 2. Weather fetch: Gets weather for the property location
 * 3. Context retrieval: Retrieves playbook/RAG context
 * 4. Prompt assembly: Combines all context into the final prompt
 * 5. Generation: Invokes the LLM to generate the email
 * 6. Post-processing: Enforces constraints (300 word limit)
 */
const emailGraphBuilder = new StateGraph(EmailGraphState)
	// Add all nodes to the graph
	.addNode('inputNormalization', inputNormalizationNode)
	.addNode('weatherFetch', weatherFetchNode)
	.addNode('contextRetrieval', contextRetrievalNode)
	.addNode('promptAssembly', promptAssemblyNode)
	.addNode('generation', generationNode)
	.addNode('postProcessing', postProcessingNode)
	// Add linear edges connecting nodes from START to END
	.addEdge(START, 'inputNormalization')
	.addEdge('inputNormalization', 'weatherFetch')
	.addEdge('weatherFetch', 'contextRetrieval')
	.addEdge('contextRetrieval', 'promptAssembly')
	.addEdge('promptAssembly', 'generation')
	.addEdge('generation', 'postProcessing')
	.addEdge('postProcessing', END);

/**
 * Compiled email generation graph.
 * Invoke with: emailGraph.invoke({ client, property, realtor_notes })
 */
export const emailGraph = emailGraphBuilder.compile();
