import type { Client } from '@/types/client';
import type { GeneratedEmail } from '@/types/email';
import type { Property } from '@/types/property';
import { Annotation } from '@langchain/langgraph';

/**
 * Weather context for the property location
 */
export type WeatherContext = {
	condition: string;
	temperature: number;
	short_summary: string;
} | null;

/**
 * LangGraph state annotation for the email generation pipeline.
 *
 * Fields:
 * - client: The selected client to generate email for
 * - property: The selected property to pitch
 * - realtor_notes: Optional additional context from the realtor
 * - weather_context: Weather information for the property location
 * - retrieved_context: RAG context from playbook and other sources
 * - final_prompt: The assembled prompt ready for LLM
 * - generated_email: The final generated email output
 */
export const EmailGraphState = Annotation.Root({
	client: Annotation<Client | null>({
		reducer: (_, newVal) => newVal,
		default: () => null,
	}),
	property: Annotation<Property | null>({
		reducer: (_, newVal) => newVal,
		default: () => null,
	}),
	realtor_notes: Annotation<string>({
		reducer: (_, newVal) => newVal,
		default: () => '',
	}),
	weather_context: Annotation<WeatherContext>({
		reducer: (_, newVal) => newVal,
		default: () => null,
	}),
	retrieved_context: Annotation<string>({
		reducer: (_, newVal) => newVal,
		default: () => '',
	}),
	final_prompt: Annotation<string>({
		reducer: (_, newVal) => newVal,
		default: () => '',
	}),
	generated_email: Annotation<GeneratedEmail | null>({
		reducer: (_, newVal) => newVal,
		default: () => null,
	}),
});

/**
 * Type representing the state of the email generation graph
 */
export type EmailGraphStateType = typeof EmailGraphState.State;
