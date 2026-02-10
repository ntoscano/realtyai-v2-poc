import type { GeneratedEmail } from '@/types/email';
import { z } from 'zod';

/**
 * Detects if a string contains emoji characters.
 * Uses surrogate pair detection for characters outside BMP (like most emojis).
 */
function containsEmoji(text: string): boolean {
	// Check for surrogate pairs (emojis are typically in supplementary planes)
	// eslint-disable-next-line no-control-regex
	const surrogatePairRegex = /[\uD800-\uDBFF][\uDC00-\uDFFF]/;
	if (surrogatePairRegex.test(text)) {
		return true;
	}

	// Check for common emoji ranges in the BMP
	// Includes: dingbats, symbols, arrows, misc symbols
	const bmpEmojiRegex =
		/[\u2600-\u26FF\u2700-\u27BF\u2300-\u23FF\u2B50-\u2B55]/;
	return bmpEmojiRegex.test(text);
}

// Excessive enthusiasm markers
const EXCESSIVE_ENTHUSIASM_REGEX =
	/!{2,}|!!|\bwow\b|\bamazing\b|\bincredible\b|\bfantastic\b/gi;

/**
 * Zod schema for validating generated emails.
 * Enforces no emojis and semi-professional tone.
 */
export const GeneratedEmailSchema = z.object({
	subject: z
		.string()
		.min(1, 'Subject is required')
		.refine((s) => !containsEmoji(s), 'Subject cannot contain emojis'),
	body: z
		.string()
		.min(50, 'Email body too short')
		.refine((b) => !containsEmoji(b), 'Body cannot contain emojis')
		.refine((b) => {
			const matches = b.match(EXCESSIVE_ENTHUSIASM_REGEX);
			return !matches || matches.length <= 1;
		}, 'Body is too enthusiastic - reduce exclamation marks and superlatives')
		.refine(
			(b) => b.includes('°F'),
			'Body must include weather information (temperature in °F)',
		),
});

export type ValidationResult =
	| { success: true; data: GeneratedEmail }
	| { success: false; errors: string[] };

/**
 * Validates a generated email against the schema.
 * Returns success with data or failure with error messages.
 */
export function validateEmail(email: GeneratedEmail): ValidationResult {
	const result = GeneratedEmailSchema.safeParse(email);

	if (result.success) {
		return { success: true, data: result.data };
	}

	const errors = result.error.issues.map((e) => e.message);
	return { success: false, errors };
}
