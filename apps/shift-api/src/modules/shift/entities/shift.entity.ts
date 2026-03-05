import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Facility } from './facility.entity';
import { Booking } from '../../booking/entities/booking.entity';

export type ShiftStatus = 'open' | 'booked' | 'completed' | 'cancelled';

@Index(['status', 'qualificationRequired', 'startTime'])
@Index(['facilityId', 'startTime'])
@Entity('shift')
export class Shift {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  facilityId: string;

  @Column({ type: 'varchar', length: 10 })
  qualificationRequired: string;

  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column({ type: 'int' })
  payRateCents: number;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status: ShiftStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Facility, (facility) => facility.shifts)
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @OneToOne(() => Booking, (booking) => booking.shift)
  booking: Booking;
}
