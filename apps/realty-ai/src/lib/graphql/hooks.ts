'use client';

import type { Client } from '@/types/client';
import type { Property } from '@/types/property';
import type { SimilarProperty } from '@/types/similarProperty';
import { useEffect, useState } from 'react';
import { apolloClient } from './client';
import {
	GET_ALL_CLIENTS,
	GET_ALL_PROPERTIES,
	GET_SIMILAR_PROPERTIES,
} from './queries';
import {
	type GraphQLClientNode,
	type GraphQLPropertyNode,
	type GraphQLSimilarPropertyNode,
	transformClient,
	transformProperty,
	transformSimilarProperty,
} from './transforms';

// Re-export types and transforms for backwards compatibility
export {
	type GraphQLClientNode,
	type GraphQLPropertyNode,
	type GraphQLSimilarPropertyNode,
	transformClient,
	transformProperty,
	transformSimilarProperty,
} from './transforms';

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

/**
 * GraphQL response types for similarProperties query
 */
type SimilarPropertiesResponse = {
	similarProperties: {
		nodes: GraphQLSimilarPropertyNode[];
	};
};

/**
 * Hook to fetch similar properties based on vector similarity
 */
export function useSimilarProperties(
	propertyId: string | undefined,
	limit = 5,
) {
	const [similarProperties, setSimilarProperties] = useState<SimilarProperty[]>(
		[],
	);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		if (!propertyId) {
			setSimilarProperties([]);
			return;
		}

		async function fetchSimilarProperties() {
			setLoading(true);
			try {
				const result = await apolloClient.query<SimilarPropertiesResponse>({
					query: GET_SIMILAR_PROPERTIES,
					variables: { propertyId, resultLimit: limit },
				});
				if (result.data?.similarProperties?.nodes) {
					const transformed = result.data.similarProperties.nodes.map(
						transformSimilarProperty,
					);
					setSimilarProperties(transformed);
				}
			} catch (err) {
				setError(
					err instanceof Error
						? err
						: new Error('Failed to fetch similar properties'),
				);
			} finally {
				setLoading(false);
			}
		}

		fetchSimilarProperties();
	}, [propertyId, limit]);

	return { similarProperties, loading, error };
}
