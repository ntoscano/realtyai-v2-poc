import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
} from 'typeorm';

/**
 * Property payload interface for JSONB column
 */
export interface PropertyPayload {
	address: string;
	city: string;
	state: string;
	price: number;
	beds: number;
	baths: number;
	sqft: number;
	property_type: string;
	highlights: string[];
	neighborhood_description: string;
}

/**
 * Property meta interface for JSONB column
 */
export interface PropertyMeta {
	[key: string]: unknown;
}

@Entity('property')
export class Property {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 255 })
	type: string;

	@Column({ type: 'varchar', length: 255 })
	name: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	slug: string | null;

	@Column({ type: 'jsonb', default: {} })
	payload: PropertyPayload;

	@Column({ type: 'jsonb', default: {} })
	meta: PropertyMeta;

	// Note: embedding column is managed via raw SQL (vector type not supported by TypeORM)
	// 1024 dimensions for Amazon Titan Embed Text V2
	// See migrations for the actual column definition

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
