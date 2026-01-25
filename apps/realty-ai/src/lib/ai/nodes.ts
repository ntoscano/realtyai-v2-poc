import {
	createClientDocument,
	createPropertyDocument,
	getRealtorPlaybookDocument,
} from './documentLoaders';
import { emailPromptTemplate } from './emailPrompt';
import type { EmailGraphStateType } from './graphState';
import { fetchWeather } from './weatherFetcher';

/**
 * Input normalization node: validates client/property and normalizes notes.
 * Ensures all required inputs are present before proceeding.
 */
export async function inputNormalizationNode(
	state: EmailGraphStateType,
): Promise<Partial<EmailGraphStateType>> {
	const { client, property, realtor_notes } = state;

	// Validate required inputs
	if (!client) {
		throw new Error('Client is required for email generation');
	}

	if (!property) {
		throw new Error('Property is required for email generation');
	}

	// Normalize notes - trim whitespace and handle empty strings
	const normalizedNotes = realtor_notes?.trim() || '';

	return {
		realtor_notes: normalizedNotes,
	};
}

/**
 * Weather fetch node: retrieves weather for the property location.
 * Handles failures gracefully by setting weather_context to null.
 */
export async function weatherFetchNode(
	state: EmailGraphStateType,
): Promise<Partial<EmailGraphStateType>> {
	const { property } = state;

	// Property should be validated by inputNormalizationNode
	if (!property) {
		return { weather_context: null };
	}

	const weather = await fetchWeather(property.city, property.state);

	return {
		weather_context: weather,
	};
}

/**
 * Context retrieval node: retrieves relevant context for email generation.
 * Currently returns static playbook context (placeholder for future RAG implementation).
 */
export async function contextRetrievalNode(
	_state: EmailGraphStateType,
): Promise<Partial<EmailGraphStateType>> {
	// Get the realtor playbook as the base context
	const playbookDocument = getRealtorPlaybookDocument();

	return {
		retrieved_context: playbookDocument.pageContent,
	};
}

/**
 * Prompt assembly node: formats all context into the prompt template.
 * Combines client info, property info, weather, context, and notes into the final prompt.
 */
export async function promptAssemblyNode(
	state: EmailGraphStateType,
): Promise<Partial<EmailGraphStateType>> {
	const {
		client,
		property,
		realtor_notes,
		weather_context,
		retrieved_context,
	} = state;

	// These should be validated by inputNormalizationNode
	if (!client || !property) {
		throw new Error('Client and property are required for prompt assembly');
	}

	// Create document representations for client and property
	const clientDocument = createClientDocument(client);
	const propertyDocument = createPropertyDocument(property);

	// Format weather information
	const weatherInfo = weather_context
		? `Current conditions: ${weather_context.short_summary}`
		: 'Weather information not available';

	// Format notes
	const notesInfo = realtor_notes || 'None provided';

	// Format the prompt using the template
	const formattedPrompt = await emailPromptTemplate.format({
		client_info: clientDocument.pageContent,
		property_info: propertyDocument.pageContent,
		context: retrieved_context || 'No additional context',
		weather: weatherInfo,
		notes: notesInfo,
	});

	return {
		final_prompt: formattedPrompt,
	};
}

/**
 * Post-processing node: enforces constraints on the generated email.
 * Currently enforces the 300 word limit by truncating if necessary.
 */
export async function postProcessingNode(
	state: EmailGraphStateType,
): Promise<Partial<EmailGraphStateType>> {
	const { generated_email } = state;

	if (!generated_email) {
		return {};
	}

	// Count words in the body
	const words = generated_email.body.split(/\s+/).filter((w) => w.length > 0);
	const wordCount = words.length;

	// If within limit, return as-is
	if (wordCount <= 300) {
		return {};
	}

	// Truncate to 300 words and add ellipsis
	const truncatedWords = words.slice(0, 297);
	const truncatedBody = truncatedWords.join(' ') + '...';

	return {
		generated_email: {
			subject: generated_email.subject,
			body: truncatedBody,
		},
	};
}
