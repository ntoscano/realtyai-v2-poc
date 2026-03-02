import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ShiftService } from './shift.service';
import { CreateShiftDto } from './dto/create-shift.dto';

@Controller('api')
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Post('shifts')
  async createShift(@Body() dto: CreateShiftDto) {
    return this.shiftService.create(dto);
  }

  @Get('shifts')
  async listShifts(
    @Query('status') status?: string,
    @Query('qualification') qualification?: string,
  ) {
    return this.shiftService.findAll(status, qualification);
  }

  @Get('shifts/:id')
  async getShift(@Param('id') id: string) {
    return this.shiftService.findOne(id);
  }

  @Get('facilities')
  async listFacilities() {
    return this.shiftService.listFacilities();
  }

  @Get('professionals')
  async listProfessionals() {
    return this.shiftService.listProfessionals();
  }
}
