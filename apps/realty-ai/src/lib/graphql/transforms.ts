import type { Client } from '@/types/client';
import type { Property } from '@/types/property';
import type { SimilarProperty } from '@/types/similarProperty';

/**
 * GraphQL property node from PostGraphile
 */
export type GraphQLPropertyNode = {
	id: string;
	name: string;
	slug: string | null;
	payload: {
		address: string;
		city: string;
		state: string;
		price: number;
		beds: number;
		baths: number;
		sqft: number;
		property_type: string;
		highlights: string[];
		neighborhood_description: string;
	};
};

/**
 * GraphQL client node from PostGraphile
 */
export type GraphQLClientNode = {
	id: string;
	name: string;
	email: string;
	slug: string | null;
	payload: {
		buying_stage: string;
		preferences: string[];
		budget_range: string;
		lifestyle_notes: string;
		communication_style: string;
	};
};

/**
 * GraphQL similar property node from similarProperties function
 */
export type GraphQLSimilarPropertyNode = {
	id: string;
	name: string;
	slug: string | null;
	payload: {
		address: string;
		city: string;
		state: string;
		price: number;
		beds: number;
		baths: number;
		sqft: number;
		property_type: string;
		highlights: string[];
		neighborhood_description: string;
	};
	similarity: number;
};

/**
 * Transform GraphQL property to frontend Property type
 */
export function transformProperty(node: GraphQLPropertyNode): Property {
	return {
		id: node.id,
		address: node.payload.address,
		city: node.payload.city,
		state: node.payload.state,
		price: node.payload.price,
		beds: node.payload.beds,
		baths: node.payload.baths,
		sqft: node.payload.sqft,
		property_type: node.payload.property_type as Property['property_type'],
		highlights: node.payload.highlights,
		neighborhood_description: node.payload.neighborhood_description,
	};
}

/**
 * Transform GraphQL client to frontend Client type
 */
export function transformClient(node: GraphQLClientNode): Client {
	return {
		id: node.id,
		name: node.name,
		email: node.email,
		buying_stage: node.payload.buying_stage as Client['buying_stage'],
		preferences: node.payload.preferences,
		budget_range: node.payload.budget_range,
		lifestyle_notes: node.payload.lifestyle_notes,
		communication_style: node.payload
			.communication_style as Client['communication_style'],
	};
}

/**
 * Transform GraphQL similar property to frontend SimilarProperty type
 */
export function transformSimilarProperty(
	node: GraphQLSimilarPropertyNode,
): SimilarProperty {
	return {
		id: node.id,
		address: node.payload.address,
		city: node.payload.city,
		state: node.payload.state,
		price: node.payload.price,
		beds: node.payload.beds,
		baths: node.payload.baths,
		sqft: node.payload.sqft,
		property_type: node.payload
			.property_type as SimilarProperty['property_type'],
		highlights: node.payload.highlights,
		neighborhood_description: node.payload.neighborhood_description,
		similarity: node.similarity,
	};
}
