import type { GeneratedEmail } from '@/types/email';
import {
	createClientDocument,
	createPropertyDocument,
	getRealtorPlaybookDocument,
} from './documentLoaders';
import { emailPromptTemplate } from './emailPrompt';
import { validateEmail } from './emailValidator';
import type { EmailGraphStateType } from './graphState';
import { llm } from './llm';
import { fetchWeather } from './weatherFetcher';

const MAX_GENERATION_ATTEMPTS = 3;

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
 * Throws an error if weather cannot be fetched (weather is required).
 */
export async function weatherFetchNode(
	state: EmailGraphStateType,
): Promise<Partial<EmailGraphStateType>> {
	const { property } = state;

	if (!property) {
		throw new Error('Property is required for weather fetch');
	}

	const weather = await fetchWeather(property.city, property.state);

	if (!weather) {
		throw new Error(
			`Weather information is required but could not be fetched for ${property.city}, ${property.state}`,
		);
	}

	return { weather_context: weather };
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
 * Parse the LLM response to extract SUBJECT: and BODY: sections.
 * Returns a GeneratedEmail object with subject and body.
 */
function parseEmailResponse(response: string): GeneratedEmail {
	// Default fallback values
	const fallbackEmail: GeneratedEmail = {
		subject: 'A Property You Might Love',
		body:
			response.trim() ||
			'I found a property that might interest you. Please let me know if you would like more details.',
	};

	// Try to parse SUBJECT: and BODY: sections
	const subjectMatch = response.match(/SUBJECT:\s*(.+?)(?=\n|BODY:|$)/i);
	const bodyMatch = response.match(/BODY:\s*([\s\S]+?)$/i);

	if (!subjectMatch || !bodyMatch) {
		// If we can't parse the expected format, return fallback
		console.warn('Could not parse email response format, using fallback');
		return fallbackEmail;
	}

	const subject = subjectMatch[1].trim();
	const body = bodyMatch[1].trim();

	// Validate we have non-empty values
	if (!subject || !body) {
		console.warn('Parsed empty subject or body, using fallback');
		return fallbackEmail;
	}

	return { subject, body };
}

/**
 * Generation node: invokes the LLM to generate the email.
 * Parses the response to extract SUBJECT: and BODY: sections.
 * Validates output with Zod schema and retries with feedback on failure.
 */
export async function generationNode(
	state: EmailGraphStateType,
): Promise<Partial<EmailGraphStateType>> {
	const { final_prompt } = state;

	if (!final_prompt) {
		throw new Error('Final prompt is required for generation');
	}

	let lastValidationErrors: string[] = [];

	for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt++) {
		try {
			// Build prompt - include validation feedback on retry
			let prompt = final_prompt;
			if (attempt > 1 && lastValidationErrors.length > 0) {
				const errorList = lastValidationErrors.map((e) => `- ${e}`).join('\n');
				prompt =
					`${final_prompt}\n\n` +
					`IMPORTANT: Your previous attempt was rejected for these reasons:\n` +
					`${errorList}\n\n` +
					`Please regenerate the email addressing these issues.`;
			}

			// Invoke the LLM with the assembled prompt
			const response = await llm.invoke(prompt);

			// Extract the text content from the response
			const responseText =
				typeof response.content === 'string'
					? response.content
					: Array.isArray(response.content)
					? response.content
							.filter((block) => typeof block === 'object' && 'text' in block)
							.map((block) => (block as { text: string }).text)
							.join('')
					: '';

			// Parse the response to extract subject and body
			const generatedEmail = parseEmailResponse(responseText);

			// Validate with Zod schema
			const validation = validateEmail(generatedEmail);

			if (validation.success) {
				console.log(`[generationNode] Success on attempt ${attempt}`);
				return { generated_email: validation.data };
			}

			// Validation failed - log and retry
			lastValidationErrors = validation.errors;
			console.warn(
				`[generationNode] Attempt ${attempt} failed validation:`,
				validation.errors,
			);
		} catch (error: unknown) {
			const errName = error instanceof Error ? error.name : 'UnknownError';
			const errMessage = error instanceof Error ? error.message : String(error);

			console.error(
				`[generationNode] LLM invocation failed (${errName}): ${errMessage}`,
			);

			// Surface auth/config errors so developers can diagnose quickly
			if (
				errName === 'AccessDeniedException' ||
				errMessage.includes('Authentication failed')
			) {
				console.error(
					'[generationNode] AWS Bedrock credentials are invalid or expired. ' +
						'Update AI_AWS_BEDROCK_ACCESS_KEY_ID and AI_AWS_BEDROCK_SECRET_ACCESS_KEY in .env.local',
				);
			}

			// Re-throw so the API route can return a proper error response
			throw new Error(`LLM generation failed: ${errMessage}`);
		}
	}

	// All attempts failed validation
	throw new Error(
		`Email generation failed validation after ${MAX_GENERATION_ATTEMPTS} attempts. ` +
			`Last errors: ${lastValidationErrors.join(', ')}`,
	);
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
