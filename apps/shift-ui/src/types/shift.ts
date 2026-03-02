export type FacilityType = 'nursing_home' | 'hospital' | 'clinic';
export type Qualification = 'CNA' | 'LPN' | 'RN';
export type ShiftStatus = 'open' | 'booked' | 'completed' | 'cancelled';

export interface Facility {
	id: string;
	name: string;
	type: FacilityType;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface Professional {
	id: string;
	name: string;
	qualification: Qualification;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface BookingInfo {
	id: string;
	shiftId: string;
	professionalId: string;
	status: string;
	bookedAt: string;
	professional?: Professional;
}

export interface Shift {
	id: string;
	facilityId: string;
	qualificationRequired: Qualification;
	startTime: string;
	endTime: string;
	payRateCents: number;
	status: ShiftStatus;
	createdAt: string;
	updatedAt: string;
	facility?: Facility;
	booking?: BookingInfo;
}
