import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthQuestionnaire } from './entities/health-questionnaire.entity';
import { Patient } from '../patient/entities/patient.entity';
import { Specialty } from '../clinician/entities/specialty.entity';
import { QuestionnaireController } from './questionnaire.controller';
import { QuestionnaireService } from './questionnaire.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([HealthQuestionnaire, Patient, Specialty]),
	],
	controllers: [QuestionnaireController],
	providers: [QuestionnaireService],
})
export class QuestionnaireModule {}
