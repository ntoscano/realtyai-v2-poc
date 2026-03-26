export type Symptom =
	| 'hot_flashes'
	| 'weight_gain'
	| 'mood_changes'
	| 'sleep_issues'
	| 'low_libido'
	| 'brain_fog'
	| 'hair_thinning';

export type CareGoal =
	| 'hormone_therapy'
	| 'weight_management'
	| 'mood_support'
	| 'sleep_improvement';

export type Severity = 'mild' | 'moderate' | 'severe';

export type MenopauseStage = 'perimenopause' | 'menopause' | 'post_menopause';

export type VisitType = 'initial_consultation' | 'follow_up' | 'urgent';

export type AppointmentStatus =
	| 'scheduled'
	| 'completed'
	| 'cancelled'
	| 'no_show';

export type ClinicianCredential = 'NP' | 'CNM' | 'MD' | 'ND';

export type CancelledBy = 'patient' | 'clinician' | 'system';

export interface Patient {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	dateOfBirth: string;
	state: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface Specialty {
	id: string;
	name: string;
	displayName: string;
	description: string | null;
	createdAt: string;
}

export interface ClinicianSpecialty {
	clinicianId: string;
	specialtyId: string;
	isPrimary: boolean;
	specialty: Specialty;
}

export interface StateLicense {
	id: string;
	clinicianId: string;
	state: string;
	licenseNumber: string;
	licenseType: string;
	issuedDate: string;
	expirationDate: string;
	isVerified: boolean;
	verifiedAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Clinician {
	id: string;
	firstName: string;
	lastName: string;
	credential: ClinicianCredential;
	bio: string | null;
	yearsExperience: number | null;
	rating: number | null;
	maxPatientsPerDay: number;
	isAcceptingPatients: boolean;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	clinicianSpecialties?: ClinicianSpecialty[];
	stateLicenses?: StateLicense[];
}

export interface AvailabilitySlot {
	id: string;
	clinicianId: string;
	startTime: string;
	endTime: string;
	isBooked: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface Appointment {
	id: string;
	patientId: string;
	clinicianId: string;
	slotId: string | null;
	status: AppointmentStatus;
	visitType: VisitType;
	questionnaireId: string | null;
	notes: string | null;
	cancelledAt: string | null;
	cancelledBy: CancelledBy | null;
	createdAt: string;
	updatedAt: string;
	patient?: Patient;
	clinician?: Clinician;
	slot?: AvailabilitySlot | null;
}

export interface HealthQuestionnaire {
	id: string;
	patientId: string;
	symptoms: Symptom[];
	severity: Severity;
	careGoals: CareGoal[];
	currentMedications: string[] | null;
	hasPriorHrt: boolean;
	menopauseStage: MenopauseStage | null;
	additionalNotes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface MatchedClinician {
	id: string;
	name: string;
	credential: string;
	specialties: string[];
	matchingSpecialties: string[];
	matchScore: number;
	yearsExperience: number | null;
	rating: number | null;
	availableSlotCount: number;
	nextAvailable: string | null;
	bio: string | null;
}
