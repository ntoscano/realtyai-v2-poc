import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	Index,
} from 'typeorm';

/**
 * Client payload interface for JSONB column
 */
export interface ClientPayload {
	buying_stage: string;
	preferences: string[];
	budget_range: string;
	lifestyle_notes: string;
	communication_style: string;
}

/**
 * Client meta interface for JSONB column
 */
export interface ClientMeta {
	[key: string]: unknown;
}

@Entity('client')
export class Client {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 255 })
	type: string;

	@Column({ type: 'varchar', length: 255 })
	name: string;

	@Index()
	@Column({ type: 'varchar', length: 255 })
	email: string;

	@Column({ type: 'varchar', length: 255, nullable: true })
	slug: string | null;

	@Column({ type: 'jsonb', default: {} })
	payload: ClientPayload;

	@Column({ type: 'jsonb', default: {} })
	meta: ClientMeta;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
