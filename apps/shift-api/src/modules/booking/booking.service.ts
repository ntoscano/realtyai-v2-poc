import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Shift } from '../shift/entities/shift.entity';
import { Professional } from '../shift/entities/professional.entity';
import { Booking } from './entities/booking.entity';
import { BookShiftDto } from './dto/book-shift.dto';

@Injectable()
export class BookingService {
  constructor(private readonly dataSource: DataSource) {}

  async bookShift(shiftId: string, dto: BookShiftDto): Promise<Shift> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the shift row with pessimistic_write
      // Use innerJoin (not leftJoin) because FOR UPDATE cannot be applied to nullable outer joins
      const shift = await queryRunner.manager
        .getRepository(Shift)
        .createQueryBuilder('shift')
        .setLock('pessimistic_write')
        .innerJoinAndSelect('shift.facility', 'facility')
        .where('shift.id = :id', { id: shiftId })
        .getOne();

      if (!shift) {
        throw new NotFoundException(`Shift with ID "${shiftId}" not found`);
      }

      if (shift.status !== 'open') {
        throw new ConflictException('Shift is already booked');
      }

      // Validate professional exists
      const professional = await queryRunner.manager
        .getRepository(Professional)
        .findOneBy({ id: dto.professionalId });

      if (!professional) {
        throw new NotFoundException(
          `Professional with ID "${dto.professionalId}" not found`,
        );
      }

      // Validate qualification match
      if (professional.qualification !== shift.qualificationRequired) {
        throw new BadRequestException(
          `Professional qualification '${professional.qualification}' does not match required '${shift.qualificationRequired}'`,
        );
      }

      // Create booking
      const booking = queryRunner.manager.getRepository(Booking).create({
        shiftId,
        professionalId: dto.professionalId,
      });
      await queryRunner.manager.getRepository(Booking).save(booking);

      // Update shift status
      shift.status = 'booked';
      await queryRunner.manager.getRepository(Shift).save(shift);

      await queryRunner.commitTransaction();

      // Return shift with full relations
      booking.professional = professional;
      shift.booking = booking;
      return shift;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
