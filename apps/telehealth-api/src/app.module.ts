import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeOrmModuleConfig } from './config/typeorm';
import { QuestionnaireModule } from './modules/questionnaire/questionnaire.module';
import { ClinicianModule } from './modules/clinician/clinician.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { PatientModule } from './modules/patient/patient.module';

@Module({
	imports: [
		TypeOrmModule.forRoot(getTypeOrmModuleConfig()),
		QuestionnaireModule,
		ClinicianModule,
		AppointmentModule,
		PatientModule,
	],
})
export class AppModule {}
