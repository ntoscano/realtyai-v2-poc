import { mockClients } from '@/data/mockClients';
import { mockProperties } from '@/data/mockProperties';
import { emailGraph } from '@/lib/ai/emailGraph';
import { apolloClient } from '@/lib/graphql/client';
import {
	GraphQLClientNode,
	GraphQLPropertyNode,
	transformClient,
	transformProperty,
} from '@/lib/graphql/hooks';
import { GET_CLIENT_BY_ID, GET_PROPERTY_BY_ID } from '@/lib/graphql/queries';
import type { Client } from '@/types/client';
import type { Property } from '@/types/property';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GraphQL response type for propertyById query
 */
type PropertyByIdResponse = {
	propertyById: GraphQLPropertyNode | null;
};

/**
 * GraphQL response type for clientById query
 */
type ClientByIdResponse = {
	clientById: GraphQLClientNode | null;
};

/**
 * Check if a string looks like a UUID
 */
function isUUID(id: string): boolean {
	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(id);
}

/**
 * Look up a property by ID from GraphQL or mock data
 */
async function lookupProperty(propertyId: string): Promise<Property | null> {
	// First try mock data (for backwards compatibility)
	const mockProperty = mockProperties.find((p) => p.id === propertyId);
	if (mockProperty) {
		return mockProperty;
	}

	// If it looks like a UUID, try GraphQL
	if (isUUID(propertyId)) {
		try {
			const { data } = await apolloClient.query<PropertyByIdResponse>({
				query: GET_PROPERTY_BY_ID,
				variables: { id: propertyId },
			});

			if (data?.propertyById) {
				return transformProperty(data.propertyById);
			}
		} catch (err) {
			console.error('Failed to fetch property from GraphQL:', err);
		}
	}

	return null;
}

/**
 * Look up a client by ID from GraphQL or mock data
 */
async function lookupClient(clientId: string): Promise<Client | null> {
	// First try mock data (for backwards compatibility)
	const mockClient = mockClients.find((c) => c.id === clientId);
	if (mockClient) {
		return mockClient;
	}

	// If it looks like a UUID, try GraphQL
	if (isUUID(clientId)) {
		try {
			const { data } = await apolloClient.query<ClientByIdResponse>({
				query: GET_CLIENT_BY_ID,
				variables: { id: clientId },
			});

			if (data?.clientById) {
				return transformClient(data.clientById);
			}
		} catch (err) {
			console.error('Failed to fetch client from GraphQL:', err);
		}
	}

	return null;
}

/**
 * POST /api/generate-email
 *
 * Generates a personalized email for a realtor to send to a client about a property.
 *
 * Request body:
 * - clientId: string - The ID of the client (mock data ID or GraphQL UUID)
 * - propertyId: string - The ID of the property (mock data ID or GraphQL UUID)
 * - notes?: string - Optional realtor notes to customize the email
 *
 * Response:
 * - success: { subject: string, body: string }
 * - error: { error: string }
 */
export async function POST(request: NextRequest) {
	try {
		// Parse request body
		const body = await request.json();
		const { clientId, propertyId, notes } = body;

		// Validate required fields
		if (!clientId || typeof clientId !== 'string') {
			return NextResponse.json(
				{ error: 'clientId is required and must be a string' },
				{ status: 400 },
			);
		}

		if (!propertyId || typeof propertyId !== 'string') {
			return NextResponse.json(
				{ error: 'propertyId is required and must be a string' },
				{ status: 400 },
			);
		}

		// Look up client from mock data or GraphQL
		const client = await lookupClient(clientId);
		if (!client) {
			return NextResponse.json(
				{ error: `Client not found with id: ${clientId}` },
				{ status: 404 },
			);
		}

		// Look up property from mock data or GraphQL
		const property = await lookupProperty(propertyId);
		if (!property) {
			return NextResponse.json(
				{ error: `Property not found with id: ${propertyId}` },
				{ status: 404 },
			);
		}

		// Invoke the LangGraph email generation pipeline
		const result = await emailGraph.invoke({
			client,
			property,
			realtor_notes: notes || '',
		});

		// Check if email was generated
		if (!result.generated_email) {
			return NextResponse.json(
				{ error: 'Failed to generate email' },
				{ status: 500 },
			);
		}

		// Return the generated email
		return NextResponse.json(result.generated_email);
	} catch (error) {
		console.error('Error generating email:', error);

		// Handle JSON parsing errors
		if (error instanceof SyntaxError) {
			return NextResponse.json(
				{ error: 'Invalid JSON in request body' },
				{ status: 400 },
			);
		}

		// Handle other errors
		return NextResponse.json(
			{ error: 'Internal server error while generating email' },
			{ status: 500 },
		);
	}
}
