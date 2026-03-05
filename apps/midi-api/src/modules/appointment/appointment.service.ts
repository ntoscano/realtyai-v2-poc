import {
	Injectable,
	NotFoundException,
	ConflictException,
	BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, DeepPartial } from 'typeorm';
import { Appointment, VisitType } from './entities/appointment.entity';
import { AvailabilitySlot } from './entities/availability-slot.entity';
import { Patient } from '../patient/entities/patient.entity';
import { Clinician } from '../clinician/entities/clinician.entity';
import { StateLicense } from '../clinician/entities/state-license.entity';
import { BookAppointmentDto } from './dto/book-appointment.dto';

export interface BookAppointmentResult {
	id: string;
	patientId: string;
	clinicianId: string;
	clinicianName: string;
	startTime: Date;
	endTime: Date;
	status: string;
	visitType: string;
}

@Injectable()
export class AppointmentService {
	constructor(
		@InjectRepository(Appointment)
		private readonly appointmentRepository: Repository<Appointment>,
		@InjectRepository(AvailabilitySlot)
		private readonly slotRepository: Repository<AvailabilitySlot>,
		@InjectRepository(Patient)
		private readonly patientRepository: Repository<Patient>,
		@InjectRepository(Clinician)
		private readonly clinicianRepository: Repository<Clinician>,
		@InjectRepository(StateLicense)
		private readonly licenseRepository: Repository<StateLicense>,
		private readonly dataSource: DataSource,
	) {}

	async book(dto: BookAppointmentDto): Promise<BookAppointmentResult> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// Acquire pessimistic write lock on the slot
			const slot = await queryRunner.manager
				.createQueryBuilder(AvailabilitySlot, 'slot')
				.innerJoinAndSelect('slot.clinician', 'clinician')
				.where('slot.id = :slotId', { slotId: dto.slotId })
				.setLock('pessimistic_write')
				.getOne();

			if (!slot) {
				throw new NotFoundException(
					`Availability slot with ID "${dto.slotId}" not found`,
				);
			}

			if (slot.isBooked) {
				throw new ConflictException('This time slot is no longer available');
			}

			// Validate clinician matches
			if (slot.clinicianId !== dto.clinicianId) {
				throw new BadRequestException(
					'Slot does not belong to the specified clinician',
				);
			}

			// Validate patient exists
			const patient = await queryRunner.manager.findOneBy(Patient, {
				id: dto.patientId,
			});
			if (!patient) {
				throw new NotFoundException(
					`Patient with ID "${dto.patientId}" not found`,
				);
			}

			// Validate clinician has a verified, non-expired license in patient's state
			const now = new Date().toISOString().split('T')[0];
			const license = await queryRunner.manager
				.createQueryBuilder(StateLicense, 'license')
				.where('license.clinicianId = :clinicianId', {
					clinicianId: dto.clinicianId,
				})
				.andWhere('license.state = :state', { state: patient.state })
				.andWhere('license.isVerified = :isVerified', {
					isVerified: true,
				})
				.andWhere('license.expirationDate > :now', { now })
				.getOne();

			if (!license) {
				throw new BadRequestException(
					`Clinician is not licensed to practice in ${patient.state}`,
				);
			}

			// Create appointment
			const visitType: VisitType =
				(dto.visitType as VisitType) || 'initial_consultation';
			const appointmentData: DeepPartial<Appointment> = {
				patientId: dto.patientId,
				clinicianId: dto.clinicianId,
				slotId: dto.slotId,
				questionnaireId: dto.questionnaireId,
				visitType,
				status: 'scheduled',
			};
			const appointment = queryRunner.manager.create(
				Appointment,
				appointmentData,
			);
			await queryRunner.manager.save(Appointment, appointment);

			// Mark slot as booked
			slot.isBooked = true;
			await queryRunner.manager.save(AvailabilitySlot, slot);

			await queryRunner.commitTransaction();

			const clinician = slot.clinician;
			return {
				id: appointment.id,
				patientId: appointment.patientId,
				clinicianId: appointment.clinicianId,
				clinicianName: `${clinician.firstName} ${clinician.lastName}, ${clinician.credential}`,
				startTime: slot.startTime,
				endTime: slot.endTime,
				status: appointment.status,
				visitType: appointment.visitType,
			};
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}
}
