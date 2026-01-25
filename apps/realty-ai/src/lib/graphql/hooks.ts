'use client';

import type { Client } from '@/types/client';
import type { Property } from '@/types/property';
import { useEffect, useState } from 'react';
import { apolloClient } from './client';
import { GET_ALL_CLIENTS, GET_ALL_PROPERTIES } from './queries';

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
 * GraphQL response types for allProperties query
 */
type AllPropertiesResponse = {
	allProperties: {
		nodes: GraphQLPropertyNode[];
	};
};

/**
 * GraphQL response types for allClients query
 */
type AllClientsResponse = {
	allClients: {
		nodes: GraphQLClientNode[];
	};
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
 * Hook to fetch properties from GraphQL API
 */
export function useProperties() {
	const [properties, setProperties] = useState<Property[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		async function fetchProperties() {
			try {
				const result = await apolloClient.query<AllPropertiesResponse>({
					query: GET_ALL_PROPERTIES,
				});
				if (result.data?.allProperties?.nodes) {
					const transformed =
						result.data.allProperties.nodes.map(transformProperty);
					setProperties(transformed);
				}
			} catch (err) {
				setError(
					err instanceof Error ? err : new Error('Failed to fetch properties'),
				);
			} finally {
				setLoading(false);
			}
		}

		fetchProperties();
	}, []);

	return { properties, loading, error };
}

/**
 * Hook to fetch clients from GraphQL API
 */
export function useClients() {
	const [clients, setClients] = useState<Client[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		async function fetchClients() {
			try {
				const result = await apolloClient.query<AllClientsResponse>({
					query: GET_ALL_CLIENTS,
				});
				if (result.data?.allClients?.nodes) {
					const transformed = result.data.allClients.nodes.map(transformClient);
					setClients(transformed);
				}
			} catch (err) {
				setError(
					err instanceof Error ? err : new Error('Failed to fetch clients'),
				);
			} finally {
				setLoading(false);
			}
		}

		fetchClients();
	}, []);

	return { clients, loading, error };
}
