import {
	Entity,
	PrimaryColumn,
	Column,
	ManyToOne,
	JoinColumn,
	Index,
} from 'typeorm';
import { Clinician } from './clinician.entity';
import { Specialty } from './specialty.entity';

@Index(['specialtyId'])
@Entity('clinician_specialty')
export class ClinicianSpecialty {
	@PrimaryColumn({ type: 'uuid' })
	clinicianId: string;

	@PrimaryColumn({ type: 'uuid' })
	specialtyId: string;

	@Column({ type: 'boolean', default: false })
	isPrimary: boolean;

	@ManyToOne(() => Clinician, (clinician) => clinician.clinicianSpecialties)
	@JoinColumn({ name: 'clinician_id' })
	clinician: Clinician;

	@ManyToOne(() => Specialty, (specialty) => specialty.clinicianSpecialties)
	@JoinColumn({ name: 'specialty_id' })
	specialty: Specialty;
}
