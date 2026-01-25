import { mockClients } from '@/data/mockClients';
import { mockProperties } from '@/data/mockProperties';
import { emailGraph } from '@/lib/ai/emailGraph';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/generate-email
 *
 * Generates a personalized email for a realtor to send to a client about a property.
 *
 * Request body:
 * - clientId: string - The ID of the client
 * - propertyId: string - The ID of the property
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

		// Look up client from mock data
		const client = mockClients.find((c) => c.id === clientId);
		if (!client) {
			return NextResponse.json(
				{ error: `Client not found with id: ${clientId}` },
				{ status: 404 },
			);
		}

		// Look up property from mock data
		const property = mockProperties.find((p) => p.id === propertyId);
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
