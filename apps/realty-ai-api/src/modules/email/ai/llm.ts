import { ChatBedrockConverse } from '@langchain/aws';

/**
 * ChatBedrock LLM instance configured for email generation.
 *
 * Uses AWS Bedrock with DeepSeek-R1 model for high-quality text generation.
 * Credentials are loaded from environment variables:
 * - AI_AWS_BEDROCK_ACCESS_KEY_ID
 * - AI_AWS_BEDROCK_SECRET_ACCESS_KEY
 * - AI_AWS_BEDROCK_REGION
 */
export const llm = new ChatBedrockConverse({
	model: 'us.deepseek.r1-v1:0', // Cross-region inference profile ID
	region: process.env.AI_AWS_BEDROCK_REGION || 'us-east-1',
	credentials: {
		accessKeyId: process.env.AI_AWS_BEDROCK_ACCESS_KEY_ID || '',
		secretAccessKey: process.env.AI_AWS_BEDROCK_SECRET_ACCESS_KEY || '',
	},
	temperature: 0.7,
	maxTokens: 1024,
});
