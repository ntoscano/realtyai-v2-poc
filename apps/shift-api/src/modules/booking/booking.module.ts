import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { Shift } from '../shift/entities/shift.entity';
import { Professional } from '../shift/entities/professional.entity';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Shift, Professional])],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
