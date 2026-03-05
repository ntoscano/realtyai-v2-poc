import {
	Injectable,
	NotFoundException,
	ConflictException,
	BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, DeepPartial } from 'typeorm';
import {
	Appointment,
	VisitType,
	AppointmentStatus,
	CancelledBy,
} from './entities/appointment.entity';
import { AvailabilitySlot } from './entities/availability-slot.entity';
import { Patient } from '../patient/entities/patient.entity';
import { Clinician } from '../clinician/entities/clinician.entity';
import { StateLicense } from '../clinician/entities/state-license.entity';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

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

export interface AppointmentListItem {
	id: string;
	patientId: string;
	patientName: string;
	clinicianId: string;
	clinicianName: string;
	startTime: Date;
	endTime: Date;
	status: string;
	visitType: string;
	createdAt: Date;
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

	async listForPatient(patientId: string): Promise<AppointmentListItem[]> {
		const appointments = await this.appointmentRepository
			.createQueryBuilder('appt')
			.innerJoinAndSelect('appt.clinician', 'clinician')
			.innerJoinAndSelect('appt.patient', 'patient')
			.leftJoinAndSelect('appt.slot', 'slot')
			.where('appt.patientId = :patientId', { patientId })
			.orderBy('slot.startTime', 'DESC')
			.getMany();

		return appointments.map((appt) => ({
			id: appt.id,
			patientId: appt.patientId,
			patientName: `${appt.patient.firstName} ${appt.patient.lastName}`,
			clinicianId: appt.clinicianId,
			clinicianName: `${appt.clinician.firstName} ${appt.clinician.lastName}, ${appt.clinician.credential}`,
			startTime: appt.slot?.startTime,
			endTime: appt.slot?.endTime,
			status: appt.status,
			visitType: appt.visitType,
			createdAt: appt.createdAt,
		}));
	}

	async listForClinician(clinicianId: string): Promise<AppointmentListItem[]> {
		const appointments = await this.appointmentRepository
			.createQueryBuilder('appt')
			.innerJoinAndSelect('appt.clinician', 'clinician')
			.innerJoinAndSelect('appt.patient', 'patient')
			.leftJoinAndSelect('appt.slot', 'slot')
			.where('appt.clinicianId = :clinicianId', { clinicianId })
			.orderBy('slot.startTime', 'DESC')
			.getMany();

		return appointments.map((appt) => ({
			id: appt.id,
			patientId: appt.patientId,
			patientName: `${appt.patient.firstName} ${appt.patient.lastName}`,
			clinicianId: appt.clinicianId,
			clinicianName: `${appt.clinician.firstName} ${appt.clinician.lastName}, ${appt.clinician.credential}`,
			startTime: appt.slot?.startTime,
			endTime: appt.slot?.endTime,
			status: appt.status,
			visitType: appt.visitType,
			createdAt: appt.createdAt,
		}));
	}

	async updateStatus(
		id: string,
		dto: UpdateAppointmentDto,
	): Promise<AppointmentListItem> {
		const queryRunner = this.dataSource.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			const appointment = await queryRunner.manager
				.createQueryBuilder(Appointment, 'appt')
				.innerJoinAndSelect('appt.clinician', 'clinician')
				.innerJoinAndSelect('appt.patient', 'patient')
				.innerJoinAndSelect('appt.slot', 'slot')
				.where('appt.id = :id', { id })
				.getOne();

			if (!appointment) {
				throw new NotFoundException(`Appointment with ID "${id}" not found`);
			}

			// Validate status transitions
			const currentStatus = appointment.status;
			const newStatus = dto.status as AppointmentStatus;

			if (currentStatus !== 'scheduled') {
				throw new BadRequestException(
					`Cannot change status from "${currentStatus}" to "${newStatus}". Only scheduled appointments can be updated.`,
				);
			}

			appointment.status = newStatus;

			// Capture slot times before potentially nulling the reference
			const slotStartTime = appointment.slot.startTime;
			const slotEndTime = appointment.slot.endTime;

			if (newStatus === 'cancelled') {
				appointment.cancelledAt = new Date();
				appointment.cancelledBy = dto.cancelledBy as CancelledBy;

				// Free the slot for rebooking
				const slot = appointment.slot;
				slot.isBooked = false;
				await queryRunner.manager.save(AvailabilitySlot, slot);

				// Release the unique slot reference so the slot can be rebooked
				appointment.slotId = null;
				appointment.slot = null as any;
			}

			await queryRunner.manager.save(Appointment, appointment);
			await queryRunner.commitTransaction();

			return {
				id: appointment.id,
				patientId: appointment.patientId,
				patientName: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
				clinicianId: appointment.clinicianId,
				clinicianName: `${appointment.clinician.firstName} ${appointment.clinician.lastName}, ${appointment.clinician.credential}`,
				startTime: slotStartTime,
				endTime: slotEndTime,
				status: appointment.status,
				visitType: appointment.visitType,
				createdAt: appointment.createdAt,
			};
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}
}
