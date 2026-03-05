import {
	Controller,
	Post,
	Get,
	Patch,
	Body,
	Param,
	Query,
	BadRequestException,
} from '@nestjs/common';
import {
	AppointmentService,
	BookAppointmentResult,
	AppointmentListItem,
} from './appointment.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Controller('api/appointments')
export class AppointmentController {
	constructor(private readonly appointmentService: AppointmentService) {}

	@Post()
	async book(@Body() dto: BookAppointmentDto): Promise<BookAppointmentResult> {
		return this.appointmentService.book(dto);
	}

	@Get()
	async list(
		@Query('patient_id') patientId?: string,
		@Query('clinician_id') clinicianId?: string,
	): Promise<AppointmentListItem[]> {
		if (patientId) {
			return this.appointmentService.listForPatient(patientId);
		}
		if (clinicianId) {
			return this.appointmentService.listForClinician(clinicianId);
		}
		throw new BadRequestException(
			'Either patient_id or clinician_id query parameter is required',
		);
	}

	@Patch(':id')
	async updateStatus(
		@Param('id') id: string,
		@Body() dto: UpdateAppointmentDto,
	): Promise<AppointmentListItem> {
		return this.appointmentService.updateStatus(id, dto);
	}
}
