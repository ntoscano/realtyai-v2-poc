import { IsUUID, IsOptional, IsIn } from 'class-validator';

export class BookAppointmentDto {
	@IsUUID()
	patientId: string;

	@IsUUID()
	clinicianId: string;

	@IsUUID()
	slotId: string;

	@IsOptional()
	@IsUUID()
	questionnaireId?: string;

	@IsOptional()
	@IsIn(['initial_consultation', 'follow_up', 'urgent'])
	visitType?: string;
}
