import { IsIn, ValidateIf } from 'class-validator';

export class UpdateAppointmentDto {
	@IsIn(['cancelled', 'completed', 'no_show'])
	status: string;

	@ValidateIf((o) => o.status === 'cancelled')
	@IsIn(['patient', 'clinician', 'system'])
	cancelledBy?: string;
}
