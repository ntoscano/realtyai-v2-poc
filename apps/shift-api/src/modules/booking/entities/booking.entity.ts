import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Shift } from '../../shift/entities/shift.entity';
import { Professional } from '../../shift/entities/professional.entity';

export type BookingStatus = 'confirmed' | 'completed' | 'cancelled';

@Index(['professionalId', 'status'])
@Entity('booking')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  shiftId: string;

  @Column({ type: 'uuid' })
  professionalId: string;

  @Column({ type: 'varchar', length: 20, default: 'confirmed' })
  status: BookingStatus;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  bookedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => Shift, (shift) => shift.booking)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ManyToOne(() => Professional)
  @JoinColumn({ name: 'professional_id' })
  professional: Professional;
}
