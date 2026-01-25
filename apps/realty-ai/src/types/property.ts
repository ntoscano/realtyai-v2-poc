export type PropertyType = 'SFH' | 'condo' | 'townhouse';

export type Property = {
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
