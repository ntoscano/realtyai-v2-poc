import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { HealthQuestionnaire } from './entities/health-questionnaire.entity';
import { Patient } from '../patient/entities/patient.entity';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { mapSymptomsAndGoalsToSpecialties } from '../../shared/symptom-specialty-map';

@Injectable()
export class QuestionnaireService {
	constructor(
		@InjectRepository(HealthQuestionnaire)
		private readonly questionnaireRepo: Repository<HealthQuestionnaire>,
		@InjectRepository(Patient)
		private readonly patientRepo: Repository<Patient>,
	) {}

	async create(dto: CreateQuestionnaireDto) {
		const patient = await this.patientRepo.findOne({
			where: { id: dto.patientId },
		});
		if (!patient) {
			throw new NotFoundException(`Patient with id ${dto.patientId} not found`);
		}

		const data: DeepPartial<HealthQuestionnaire> = {
			patientId: dto.patientId,
			symptoms: dto.symptoms,
			severity: dto.severity as HealthQuestionnaire['severity'],
			careGoals: dto.careGoals,
			menopauseStage:
				(dto.menopauseStage as HealthQuestionnaire['menopauseStage']) ?? null,
			currentMedications: dto.currentMedications,
			hasPriorHrt: dto.hasPriorHrt ?? false,
			additionalNotes: dto.additionalNotes,
		};
		const questionnaire = this.questionnaireRepo.create(data);

		const saved = await this.questionnaireRepo.save(questionnaire);

		const matchedSpecialties = mapSymptomsAndGoalsToSpecialties(
			saved.symptoms,
			saved.careGoals,
		);

		return { ...saved, matchedSpecialties };
	}

	async findOne(id: string) {
		const questionnaire = await this.questionnaireRepo.findOne({
			where: { id },
		});
		if (!questionnaire) {
			throw new NotFoundException(`Questionnaire with id ${id} not found`);
		}

		const matchedSpecialties = mapSymptomsAndGoalsToSpecialties(
			questionnaire.symptoms,
			questionnaire.careGoals,
		);

		return { ...questionnaire, matchedSpecialties };
	}
}
