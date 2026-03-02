import { Controller, Post, Param, Body } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookShiftDto } from './dto/book-shift.dto';

@Controller('api/shifts')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post(':id/book')
  async bookShift(@Param('id') id: string, @Body() dto: BookShiftDto) {
    return this.bookingService.bookShift(id, dto);
  }
}
