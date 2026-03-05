import { IsUUID } from 'class-validator';

export class BookShiftDto {
  @IsUUID()
  professionalId: string;
}
