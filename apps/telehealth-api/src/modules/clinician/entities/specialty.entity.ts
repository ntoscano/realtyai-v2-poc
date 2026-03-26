import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	OneToMany,
} from 'typeorm';
import { ClinicianSpecialty } from './clinician-specialty.entity';

@Entity('specialty')
export class Specialty {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 100, unique: true })
	name: string;

	@Column({ type: 'varchar', length: 255 })
	displayName: string;

	@Column({ type: 'text', nullable: true })
	description: string;

	@CreateDateColumn()
	createdAt: Date;

	@OneToMany(
		() => ClinicianSpecialty,
		(clinicianSpecialty) => clinicianSpecialty.specialty,
	)
	clinicianSpecialties: ClinicianSpecialty[];
}
