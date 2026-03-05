import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	OneToOne,
	JoinColumn,
	Index,
} from 'typeorm';
import { Patient } from '../../patient/entities/patient.entity';
import { Clinician } from '../../clinician/entities/clinician.entity';
import { AvailabilitySlot } from './availability-slot.entity';

export type AppointmentStatus =
	| 'scheduled'
	| 'completed'
	| 'cancelled'
	| 'no_show';
export type VisitType = 'initial_consultation' | 'follow_up' | 'urgent';
export type CancelledBy = 'patient' | 'clinician' | 'system';

@Index(['patientId', 'status'])
@Index(['clinicianId', 'status'])
@Entity('appointment')
export class Appointment {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'uuid' })
	patientId: string;

	@Column({ type: 'uuid' })
	clinicianId: string;

	@Column({ type: 'uuid', unique: true })
	slotId: string;

	@Column({ type: 'varchar', length: 20, default: 'scheduled' })
	status: AppointmentStatus;

	@Column({ type: 'varchar', length: 50, default: 'initial_consultation' })
	visitType: VisitType;

	@Column({ type: 'uuid', nullable: true })
	questionnaireId: string;

	@Column({ type: 'text', nullable: true })
	notes: string;

	@Column({ type: 'timestamptz', nullable: true })
	cancelledAt: Date;

	@Column({ type: 'varchar', length: 20, nullable: true })
	cancelledBy: CancelledBy;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;

	@ManyToOne(() => Patient, (patient) => patient.appointments)
	@JoinColumn({ name: 'patient_id' })
	patient: Patient;

	@ManyToOne(() => Clinician, (clinician) => clinician.appointments)
	@JoinColumn({ name: 'clinician_id' })
	clinician: Clinician;

	@OneToOne(() => AvailabilitySlot)
	@JoinColumn({ name: 'slot_id' })
	slot: AvailabilitySlot;
}
