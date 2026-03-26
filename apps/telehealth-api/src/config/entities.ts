import { Patient } from '../modules/patient/entities/patient.entity';
import { Clinician } from '../modules/clinician/entities/clinician.entity';
import { Specialty } from '../modules/clinician/entities/specialty.entity';
import { ClinicianSpecialty } from '../modules/clinician/entities/clinician-specialty.entity';
import { StateLicense } from '../modules/clinician/entities/state-license.entity';
import { AvailabilitySlot } from '../modules/appointment/entities/availability-slot.entity';
import { Appointment } from '../modules/appointment/entities/appointment.entity';
import { HealthQuestionnaire } from '../modules/questionnaire/entities/health-questionnaire.entity';

export const entities = [
	Patient,
	Clinician,
	Specialty,
	ClinicianSpecialty,
	StateLicense,
	AvailabilitySlot,
	Appointment,
	HealthQuestionnaire,
];
