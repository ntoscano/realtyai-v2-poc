import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './entities/appointment.entity';
import { AvailabilitySlot } from './entities/availability-slot.entity';
import { Clinician } from '../clinician/entities/clinician.entity';
import { Patient } from '../patient/entities/patient.entity';
import { StateLicense } from '../clinician/entities/state-license.entity';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([
			Appointment,
			AvailabilitySlot,
			Clinician,
			Patient,
			StateLicense,
		]),
	],
	controllers: [AppointmentController],
	providers: [AppointmentService],
})
export class AppointmentModule {}
