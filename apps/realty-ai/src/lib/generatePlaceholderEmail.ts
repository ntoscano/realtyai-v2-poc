import type { Client } from '@/types/client';
import type { GeneratedEmail } from '@/types/email';
import type { Property } from '@/types/property';

export function generatePlaceholderEmail(
	client: Client,
	property: Property,
	notes?: string,
): GeneratedEmail {
	const firstName = client.name.split(' ')[0];
	const formattedPrice = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0,
	}).format(property.price);

	const highlightsList = property.highlights.slice(0, 3).join(', ');

	const subject = `Perfect Property Match: ${property.address} in ${property.city}`;

	let body = `Hi ${firstName},

I hope this email finds you well! I came across a property that I believe would be a fantastic fit for your needs, and I wanted to share it with you right away.

**${property.address}**
${property.city}, ${property.state} | ${formattedPrice}
${property.beds} beds • ${
		property.baths
	} baths • ${property.sqft.toLocaleString()} sqft

This ${
		property.property_type === 'SFH'
			? 'single-family home'
			: property.property_type
	} features ${highlightsList}.

${property.neighborhood_description}

Based on your interest in ${
		client.preferences[0]?.toLowerCase() || 'finding the perfect home'
	}, I think this could be exactly what you're looking for.`;

	if (notes) {
		body += `\n\n${notes}`;
	}

	body += `

I'd love to schedule a showing at your earliest convenience. Would you be available this week to take a look?

Looking forward to hearing from you!

Best regards,
Your Realtor`;

	return { subject, body };
}
