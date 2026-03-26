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
import { Clinician } from '../../clinician/entities/clinician.entity';

@Unique(['clinicianId', 'startTime'])
@Index(['clinicianId', 'startTime', 'isBooked'])
@Index(['startTime', 'isBooked'])
@Entity('availability_slot')
export class AvailabilitySlot {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'uuid' })
	clinicianId: string;

	@Column({ type: 'timestamptz' })
	startTime: Date;

	@Column({ type: 'timestamptz' })
	endTime: Date;

	@Column({ type: 'boolean', default: false })
	isBooked: boolean;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;

	@ManyToOne(() => Clinician, (clinician) => clinician.availabilitySlots)
	@JoinColumn({ name: 'clinician_id' })
	clinician: Clinician;
}
