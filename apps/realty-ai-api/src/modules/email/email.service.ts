import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Client } from '../client/client.entity';
import { Property } from '../property/property.entity';
import { emailGraph } from './ai/email-graph';
import type {
	GeneratedEmail,
	EmailClient,
	EmailProperty,
} from './types/email.types';

@Injectable()
export class EmailService {
	constructor(private dataSource: DataSource) {}

	/**
	 * Transform a Client entity (with JSONB payload) to the flat EmailClient type
	 * that the AI pipeline expects.
	 */
	private transformClient(entity: Client): EmailClient {
		return {
			id: entity.id,
			name: entity.name,
			email: entity.email,
			buying_stage:
				entity.payload.buying_stage as EmailClient['buying_stage'],
			preferences: entity.payload.preferences,
			budget_range: entity.payload.budget_range,
			lifestyle_notes: entity.payload.lifestyle_notes,
			communication_style:
				entity.payload.communication_style as EmailClient['communication_style'],
		};
	}

	/**
	 * Transform a Property entity (with JSONB payload) to the flat EmailProperty type
	 * that the AI pipeline expects.
	 */
	private transformProperty(entity: Property): EmailProperty {
		return {
			id: entity.id,
			address: entity.payload.address,
			city: entity.payload.city,
			state: entity.payload.state,
			price: entity.payload.price,
			beds: entity.payload.beds,
			baths: entity.payload.baths,
			sqft: entity.payload.sqft,
			property_type:
				entity.payload.property_type as EmailProperty['property_type'],
			highlights: entity.payload.highlights,
			neighborhood_description: entity.payload.neighborhood_description,
		};
	}

	/**
	 * Generate a personalized email for a client about a property.
	 */
	async generateEmail(
		clientId: string,
		propertyId: string,
		notes?: string,
	): Promise<GeneratedEmail> {
		const clientRepo = this.dataSource.getRepository(Client);
		const propertyRepo = this.dataSource.getRepository(Property);

		const clientEntity = await clientRepo.findOne({
			where: { id: clientId },
		});
		if (!clientEntity) {
			throw new NotFoundException(`Client not found with id: ${clientId}`);
		}

		const propertyEntity = await propertyRepo.findOne({
			where: { id: propertyId },
		});
		if (!propertyEntity) {
			throw new NotFoundException(
				`Property not found with id: ${propertyId}`,
			);
		}

		const client = this.transformClient(clientEntity);
		const property = this.transformProperty(propertyEntity);

		const result = await emailGraph.invoke({
			client,
			property,
			realtor_notes: notes || '',
		});

		if (!result.generated_email) {
			throw new Error('Failed to generate email');
		}

		return result.generated_email;
	}
}
