// DATA SOURCE: LIVE (GraphQL backend)
// Looks up clients/properties via Apollo Client from the backend DB.
import { apolloClient } from '@/lib/graphql/client';
import { GET_CLIENT_BY_ID, GET_PROPERTY_BY_ID } from '@/lib/graphql/queries';
import {
	type GraphQLClientNode,
	type GraphQLPropertyNode,
	transformClient,
	transformProperty,
} from '@/lib/graphql/transforms';
import type { Client } from '@/types/client';
import type { Property } from '@/types/property';

interface PropertyByIdResponse {
	propertyById: GraphQLPropertyNode | null;
}

interface ClientByIdResponse {
	clientById: GraphQLClientNode | null;
}

function isUUID(id: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
		id,
	);
}

export async function findPropertyById(id: string): Promise<Property | null> {
	if (!isUUID(id)) {
		return null;
	}

	try {
		const result = await apolloClient.query<PropertyByIdResponse>({
			query: GET_PROPERTY_BY_ID,
			variables: { id },
		});

		const { data } = result;

		if (data?.propertyById) {
			return transformProperty(data.propertyById);
		}
	} catch (error) {
		console.error('[lookup.live] GraphQL property query error:', error);
	}
	return null;
}

export async function findClientById(id: string): Promise<Client | null> {
	if (!isUUID(id)) {
		return null;
	}

	try {
		const result = await apolloClient.query<ClientByIdResponse>({
			query: GET_CLIENT_BY_ID,
			variables: { id },
		});

		const { data } = result;

		if (data?.clientById) {
			return transformClient(data.clientById);
		}
	} catch (error) {
		console.error('[lookup.live] GraphQL client query error:', error);
	}
	return null;
}
