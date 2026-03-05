import { Controller, Post, Body } from '@nestjs/common';
import {
	AppointmentService,
	BookAppointmentResult,
} from './appointment.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';

@Controller('api/appointments')
export class AppointmentController {
	constructor(private readonly appointmentService: AppointmentService) {}

	@Post()
	async book(@Body() dto: BookAppointmentDto): Promise<BookAppointmentResult> {
		return this.appointmentService.book(dto);
	}
}
