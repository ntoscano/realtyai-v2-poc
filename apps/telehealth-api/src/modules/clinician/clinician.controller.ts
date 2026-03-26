import { Controller, Get, Param, Query } from '@nestjs/common';
import { ClinicianService } from './clinician.service';

@Controller('api')
export class ClinicianController {
	constructor(private readonly clinicianService: ClinicianService) {}

	@Get('clinicians/match')
	async matchClinicians(
		@Query('patient_id') patientId: string,
		@Query('questionnaire_id') questionnaireId: string,
	) {
		return this.clinicianService.matchClinicians(patientId, questionnaireId);
	}

	@Get('clinicians/:id')
	async findOne(@Param('id') id: string) {
		return this.clinicianService.findOne(id);
	}

	@Get('clinicians/:id/slots')
	async getAvailableSlots(
		@Param('id') clinicianId: string,
		@Query('from') from?: string,
		@Query('to') to?: string,
	) {
		return this.clinicianService.getAvailableSlots(clinicianId, from, to);
	}

	@Get('clinicians')
	async listClinicians() {
		return this.clinicianService.listClinicians();
	}

	@Get('patients')
	async listPatients() {
		return this.clinicianService.listPatients();
	}
}
