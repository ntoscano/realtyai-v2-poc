import { Injectable } from '@nestjs/common';
import {
	BedrockRuntimeClient,
	InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { DataSource } from 'typeorm';
import { Property, PropertyPayload } from '../property/property.entity';

/**
 * Service for generating property embeddings using AWS Bedrock Titan.
 * Amazon Titan Embed Text V2 produces 1024-dimensional vectors.
 */
@Injectable()
export class EmbeddingService {
	private bedrockClient: BedrockRuntimeClient;

	constructor(private dataSource: DataSource) {
		this.bedrockClient = new BedrockRuntimeClient({
			region: process.env.AI_AWS_BEDROCK_REGION || 'us-east-1',
			credentials: {
				accessKeyId: process.env.AI_AWS_BEDROCK_ACCESS_KEY_ID!,
				secretAccessKey: process.env.AI_AWS_BEDROCK_SECRET_ACCESS_KEY!,
			},
		});
	}

	/**
	 * Generate embedding for a property using AWS Bedrock Titan
	 */
	async generatePropertyEmbedding(property: Property): Promise<number[]> {
		const text = this.createPropertyText(property.payload);
		return this.getEmbedding(text);
	}

	/**
	 * Creates text representation for embedding from property payload.
	 *
	 * Example payload:
	 * {
	 *   "beds": 4, "city": "Phoenix", "sqft": 2100, "baths": 2.5,
	 *   "price": 445000, "state": "AZ", "address": "783 Sunset Boulevard",
	 *   "highlights": ["Desert landscaping", "Covered patio", "Three-car garage", "Solar panels"],
	 *   "property_type": "SFH",
	 *   "neighborhood_description": "Family-friendly Arcadia neighborhood..."
	 * }
	 */
	private createPropertyText(payload: PropertyPayload): string {
		return `
Address: ${payload.address}
Location: ${payload.city}, ${payload.state}
Property Type: ${payload.property_type}
Price: $${payload.price.toLocaleString()}
Size: ${payload.sqft.toLocaleString()} sqft
Bedrooms: ${payload.beds}
Bathrooms: ${payload.baths}
Features: ${payload.highlights.join('. ')}
Neighborhood: ${payload.neighborhood_description}
        `.trim();
	}

	/**
	 * Get embedding from AWS Bedrock Titan
	 */
	private async getEmbedding(text: string): Promise<number[]> {
		const response = await this.bedrockClient.send(
			new InvokeModelCommand({
				modelId: 'amazon.titan-embed-text-v2:0',
				body: JSON.stringify({ inputText: text }),
			}),
		);
		const result = JSON.parse(new TextDecoder().decode(response.body));
		return result.embedding;
	}

	/**
	 * Update embedding for a specific property
	 */
	async updatePropertyEmbedding(propertyId: string): Promise<void> {
		const property = await this.dataSource
			.getRepository(Property)
			.findOneBy({ id: propertyId });
		if (!property) return;

		const embedding = await this.generatePropertyEmbedding(property);
		await this.dataSource.query(
			`UPDATE property SET embedding = $1 WHERE id = $2`,
			[`[${embedding.join(',')}]`, propertyId],
		);
	}

	/**
	 * Generate embeddings for all properties that don't have one
	 */
	async generateAllEmbeddings(): Promise<number> {
		const properties = await this.dataSource.getRepository(Property).find();
		let count = 0;

		for (const property of properties) {
			try {
				await this.updatePropertyEmbedding(property.id);
				count++;
			} catch (error) {
				console.error(
					`Failed to generate embedding for property ${property.id}:`,
					error,
				);
			}
		}

		return count;
	}
}
