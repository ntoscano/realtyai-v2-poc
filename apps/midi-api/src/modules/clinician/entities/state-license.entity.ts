import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	Unique,
	Index,
} from 'typeorm';
import { Clinician } from './clinician.entity';

@Unique(['clinicianId', 'state'])
@Index(['state', 'expirationDate'])
@Entity('state_license')
export class StateLicense {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'uuid' })
	clinicianId: string;

	@Column({ type: 'varchar', length: 2 })
	state: string;

	@Column({ type: 'varchar', length: 100 })
	licenseNumber: string;

	@Column({ type: 'varchar', length: 50 })
	licenseType: string;

	@Column({ type: 'date' })
	issuedDate: string;

	@Column({ type: 'date' })
	expirationDate: string;

	@Column({ type: 'boolean', default: false })
	isVerified: boolean;

	@Column({ type: 'timestamptz', nullable: true })
	verifiedAt: Date;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;

	@ManyToOne(() => Clinician, (clinician) => clinician.stateLicenses)
	@JoinColumn({ name: 'clinician_id' })
	clinician: Clinician;
}
