import type { Client } from '@/types/client';
import type { Property } from '@/types/property';
import { Document } from '@langchain/core/documents';

/**
 * Creates a LangChain Document from a Client object.
 * The document contains client details as pageContent for RAG retrieval.
 */
export function createClientDocument(client: Client): Document {
	const pageContent = `
Client: ${client.name}
Email: ${client.email}
Buying Stage: ${client.buying_stage}
Budget Range: ${client.budget_range}
Communication Style: ${client.communication_style}
Preferences: ${client.preferences.join(', ')}
Lifestyle Notes: ${client.lifestyle_notes}
`.trim();

	return new Document({
		pageContent,
		metadata: {
			type: 'client',
			id: client.id,
		},
	});
}

/**
 * Creates a LangChain Document from a Property object.
 * The document contains property details as pageContent for RAG retrieval.
 */
export function createPropertyDocument(property: Property): Document {
	const formattedPrice = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0,
	}).format(property.price);

	const pageContent = `
Property: ${property.address}
Location: ${property.city}, ${property.state}
Price: ${formattedPrice}
Type: ${property.property_type}
Bedrooms: ${property.beds}
Bathrooms: ${property.baths}
Square Feet: ${property.sqft.toLocaleString()}
Highlights: ${property.highlights.join(', ')}
Neighborhood: ${property.neighborhood_description}
`.trim();

	return new Document({
		pageContent,
		metadata: {
			type: 'property',
			id: property.id,
		},
	});
}

/**
 * Returns a static Document containing realtor pitch guidelines.
 * This serves as the "playbook" context for email generation.
 */
export function getRealtorPlaybookDocument(): Document {
	const pageContent = `
REALTOR PITCH PLAYBOOK

1. OPENING HOOKS
- Start with a personalized greeting that shows you've done your homework
- Reference something specific about the client's preferences or lifestyle
- Keep it warm but professional

2. PROPERTY PRESENTATION
- Lead with the most compelling feature for THIS specific client
- Paint a picture of how the property fits their lifestyle
- Use sensory language (imagine, picture, feel)
- Highlight 2-3 key features that match their stated preferences

3. NEIGHBORHOOD CONTEXT
- Connect neighborhood amenities to their lifestyle notes
- Mention proximity to things they care about
- Create a sense of belonging and community

4. WEATHER-AWARE SELLING (when applicable)
- On nice days: "Perfect weather to tour the property and enjoy the outdoor spaces"
- On cold/rainy days: "Cozy up in the home's [warm feature]"
- Use weather to create urgency or comfort as appropriate

5. CALL TO ACTION
- Always include a clear next step
- Offer flexibility (call, text, email)
- Create gentle urgency without pressure

6. TONE MATCHING
- Formal clients: Professional language, complete sentences, proper structure
- Casual clients: Friendly, conversational, contractions okay
- Enthusiastic clients: Exclamation points, energy, emotional language

7. LENGTH GUIDELINES
- Keep emails under 300 words
- Short paragraphs (2-3 sentences max)
- Easy to scan on mobile devices
`.trim();

	return new Document({
		pageContent,
		metadata: {
			type: 'playbook',
			id: 'realtor-playbook',
		},
	});
}
