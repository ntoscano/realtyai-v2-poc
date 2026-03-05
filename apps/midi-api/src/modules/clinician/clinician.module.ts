import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Clinician } from './entities/clinician.entity';
import { Specialty } from './entities/specialty.entity';
import { ClinicianSpecialty } from './entities/clinician-specialty.entity';
import { StateLicense } from './entities/state-license.entity';
import { AvailabilitySlot } from '../appointment/entities/availability-slot.entity';
import { Patient } from '../patient/entities/patient.entity';
import { HealthQuestionnaire } from '../questionnaire/entities/health-questionnaire.entity';
import { ClinicianController } from './clinician.controller';
import { ClinicianService } from './clinician.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			Clinician,
			Specialty,
			ClinicianSpecialty,
			StateLicense,
			AvailabilitySlot,
			Patient,
			HealthQuestionnaire,
		]),
	],
	controllers: [ClinicianController],
	providers: [ClinicianService],
	exports: [ClinicianService],
})
export class ClinicianModule {}
