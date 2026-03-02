import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeOrmModuleConfig } from './config/typeorm';
import { ShiftModule } from './modules/shift/shift.module';
import { BookingModule } from './modules/booking/booking.module';

@Module({
	imports: [
		TypeOrmModule.forRoot(getTypeOrmModuleConfig()),
		ShiftModule,
		BookingModule,
	],
})
export class AppModule {}
