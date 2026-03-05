import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	ManyToOne,
	JoinColumn,
	Index,
} from 'typeorm';
import { Patient } from '../../patient/entities/patient.entity';

export type Severity = 'mild' | 'moderate' | 'severe';
export type MenopauseStage = 'perimenopause' | 'menopause' | 'post_menopause';

@Index(['patientId'])
@Entity('health_questionnaire')
export class HealthQuestionnaire {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ type: 'uuid' })
	patientId: string;

	@Column({ type: 'simple-array' })
	symptoms: string[];

	@Column({ type: 'varchar', length: 20 })
	severity: Severity;

	@Column({ type: 'simple-array' })
	careGoals: string[];

	@Column({ type: 'simple-array', nullable: true })
	currentMedications: string[];

	@Column({ type: 'boolean', default: false })
	hasPriorHrt: boolean;

	@Column({ type: 'varchar', length: 30, nullable: true })
	menopauseStage: MenopauseStage;

	@Column({ type: 'text', nullable: true })
	additionalNotes: string;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;

	@ManyToOne(() => Patient, (patient) => patient.questionnaires)
	@JoinColumn({ name: 'patient_id' })
	patient: Patient;
}
