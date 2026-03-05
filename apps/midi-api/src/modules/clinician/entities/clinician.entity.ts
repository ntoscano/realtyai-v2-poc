import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
} from 'typeorm';
import { StateLicense } from './state-license.entity';
import { AvailabilitySlot } from '../../appointment/entities/availability-slot.entity';
import { ClinicianSpecialty } from './clinician-specialty.entity';
import { Appointment } from '../../appointment/entities/appointment.entity';

export type ClinicianCredential = 'NP' | 'CNM' | 'MD' | 'ND';

@Entity('clinician')
export class Clinician {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 255 })
	firstName: string;

	@Column({ type: 'varchar', length: 255 })
	lastName: string;

	@Column({ type: 'varchar', length: 20 })
	credential: ClinicianCredential;

	@Column({ type: 'text', nullable: true })
	bio: string;

	@Column({ type: 'int', nullable: true })
	yearsExperience: number;

	@Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
	rating: number;

	@Column({ type: 'int', default: 8 })
	maxPatientsPerDay: number;

	@Column({ type: 'boolean', default: true })
	isAcceptingPatients: boolean;

	@Column({ type: 'boolean', default: true })
	isActive: boolean;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;

	@OneToMany(() => StateLicense, (license) => license.clinician)
	stateLicenses: StateLicense[];

	@OneToMany(() => AvailabilitySlot, (slot) => slot.clinician)
	availabilitySlots: AvailabilitySlot[];

	@OneToMany(
		() => ClinicianSpecialty,
		(clinicianSpecialty) => clinicianSpecialty.clinician,
	)
	clinicianSpecialties: ClinicianSpecialty[];

	@OneToMany(() => Appointment, (appointment) => appointment.clinician)
	appointments: Appointment[];
}
