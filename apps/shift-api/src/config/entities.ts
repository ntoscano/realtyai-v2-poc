import { Facility } from '../modules/shift/entities/facility.entity';
import { Professional } from '../modules/shift/entities/professional.entity';
import { Shift } from '../modules/shift/entities/shift.entity';
import { Booking } from '../modules/booking/entities/booking.entity';

/**
 * Entity registry for TypeORM
 * All entities must be registered here to be managed by TypeORM
 */
export const entities: any[] = [Facility, Professional, Shift, Booking];
