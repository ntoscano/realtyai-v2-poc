import { IsUUID, IsIn, IsDateString, IsInt, Min } from 'class-validator';

export class CreateShiftDto {
  @IsUUID()
  facilityId: string;

  @IsIn(['CNA', 'LPN', 'RN'])
  qualificationRequired: 'CNA' | 'LPN' | 'RN';

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsInt()
  @Min(1)
  payRateCents: number;
}
