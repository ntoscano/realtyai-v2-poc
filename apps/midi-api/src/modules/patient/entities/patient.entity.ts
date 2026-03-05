import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
} from 'typeorm';
import { Appointment } from '../../appointment/entities/appointment.entity';
import { HealthQuestionnaire } from '../../questionnaire/entities/health-questionnaire.entity';

@Entity('patient')
export class Patient {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'varchar', length: 255 })
	firstName: string;

	@Column({ type: 'varchar', length: 255 })
	lastName: string;

	@Column({ type: 'varchar', length: 255, unique: true })
	email: string;

	@Column({ type: 'date' })
	dateOfBirth: string;

	@Column({ type: 'varchar', length: 2 })
	state: string;

	@Column({ type: 'boolean', default: true })
	isActive: boolean;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;

	@OneToMany(() => Appointment, (appointment) => appointment.patient)
	appointments: Appointment[];

	@OneToMany(
		() => HealthQuestionnaire,
		(questionnaire) => questionnaire.patient,
	)
	questionnaires: HealthQuestionnaire[];
}
