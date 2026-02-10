'use client';

import type { Client } from '@/types/client';
import type { Property } from '@/types/property';
import { useEffect, useState } from 'react';
import { apolloClient } from './client';
import { GET_ALL_CLIENTS, GET_ALL_PROPERTIES } from './queries';
import {
	type GraphQLClientNode,
	type GraphQLPropertyNode,
	transformClient,
	transformProperty,
} from './transforms';

// Re-export types and transforms for backwards compatibility
export {
	type GraphQLClientNode,
	type GraphQLPropertyNode,
	transformClient,
	transformProperty,
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
