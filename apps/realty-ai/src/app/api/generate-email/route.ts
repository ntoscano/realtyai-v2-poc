import { emailGraph } from '@/lib/ai/emailGraph';
// DATA SOURCE: Currently using MOCK lookups.
// To switch to live backend, change to: import { findClientById, findPropertyById } from '@/lib/data/lookup.live';
import { findClientById, findPropertyById } from '@/lib/data/lookup.live';
import { NextRequest, NextResponse } from 'next/server';

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

		const client = await findClientById(clientId);
		if (!client) {
			return NextResponse.json(
				{ error: `Client not found with id: ${clientId}` },
				{ status: 404 },
			);
		}

		const property = await findPropertyById(propertyId);
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

		// Surface actionable error details for LLM failures
		const message = error instanceof Error ? error.message : 'Unknown error';
		return NextResponse.json(
			{ error: `Email generation failed: ${message}` },
			{ status: 500 },
		);
	}
}
