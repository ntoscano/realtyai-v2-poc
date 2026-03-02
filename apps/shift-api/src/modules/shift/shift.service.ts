import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Facility } from './entities/facility.entity';
import { Professional } from './entities/professional.entity';
import { Shift } from './entities/shift.entity';
import { CreateShiftDto } from './dto/create-shift.dto';

@Injectable()
export class ShiftService {
  constructor(
    @InjectRepository(Facility)
    private readonly facilityRepository: Repository<Facility>,
    @InjectRepository(Professional)
    private readonly professionalRepository: Repository<Professional>,
    @InjectRepository(Shift)
    private readonly shiftRepository: Repository<Shift>,
  ) {}

  async create(dto: CreateShiftDto): Promise<Shift> {
    const facility = await this.facilityRepository.findOneBy({
      id: dto.facilityId,
    });
    if (!facility) {
      throw new NotFoundException(
        `Facility with ID "${dto.facilityId}" not found`,
      );
    }

    if (new Date(dto.endTime) <= new Date(dto.startTime)) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const shift = this.shiftRepository.create({
      facilityId: dto.facilityId,
      qualificationRequired: dto.qualificationRequired,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      payRateCents: dto.payRateCents,
    });

    const saved = await this.shiftRepository.save(shift);

    // Return with facility relation
    saved.facility = facility;
    return saved;
  }

  async findAll(
    status?: string,
    qualification?: string,
  ): Promise<Shift[]> {
    const qb = this.shiftRepository
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.facility', 'facility')
      .leftJoinAndSelect('shift.booking', 'booking')
      .leftJoinAndSelect('booking.professional', 'professional')
      .orderBy('shift.startTime', 'ASC');

    if (status && status !== 'all') {
      qb.andWhere('shift.status = :status', { status });
    }

    if (qualification) {
      qb.andWhere('shift.qualificationRequired = :qualification', {
        qualification,
      });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Shift> {
    const shift = await this.shiftRepository
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.facility', 'facility')
      .leftJoinAndSelect('shift.booking', 'booking')
      .leftJoinAndSelect('booking.professional', 'professional')
      .where('shift.id = :id', { id })
      .getOne();

    if (!shift) {
      throw new NotFoundException(`Shift with ID "${id}" not found`);
    }

    return shift;
  }

  async listFacilities(): Promise<Facility[]> {
    return this.facilityRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async listProfessionals(): Promise<Professional[]> {
    return this.professionalRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }
}
