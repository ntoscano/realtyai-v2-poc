export type GeneratedEmail = {
	subject: string;
	body: string;
};

export type BuyingStage = 'browsing' | 'active' | 'ready_to_offer';
export type CommunicationStyle = 'formal' | 'casual' | 'enthusiastic';
export type PropertyType = 'SFH' | 'condo' | 'townhouse';

/**
 * Flat client shape used by the AI pipeline.
 * Derived from the Client entity's id/name/email + JSONB payload fields.
 */
export type EmailClient = {
	id: string;
	name: string;
	email: string;
	buying_stage: BuyingStage;
	preferences: string[];
	budget_range: string;
	lifestyle_notes: string;
	communication_style: CommunicationStyle;
};

/**
 * Flat property shape used by the AI pipeline.
 * Derived from the Property entity's id + JSONB payload fields.
 */
export type EmailProperty = {
	id: string;
	address: string;
	city: string;
	state: string;
	price: number;
	beds: number;
	baths: number;
	sqft: number;
	property_type: PropertyType;
	highlights: string[];
	neighborhood_description: string;
};
