import type {
	Appointment,
	AvailabilitySlot,
	Clinician,
	HealthQuestionnaire,
	MatchedClinician,
	Patient,
	Severity,
	Symptom,
	CareGoal,
	MenopauseStage,
	VisitType,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3004';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({ message: res.statusText }));
		const error = new Error(body.message ?? `API error ${res.status}`);
		(error as ApiError).status = res.status;
		throw error;
	}

	return res.json() as Promise<T>;
}

export interface ApiError extends Error {
	status: number;
}

// --- Patients ---

export async function listPatients(): Promise<Patient[]> {
	return apiFetch<Patient[]>('/api/patients');
}

// --- Questionnaires ---

export interface SubmitQuestionnairePayload {
	patientId: string;
	symptoms: Symptom[];
	severity: Severity;
	careGoals: CareGoal[];
	menopauseStage?: MenopauseStage;
	currentMedications?: string[];
	hasPriorHrt?: boolean;
	additionalNotes?: string;
}

export interface QuestionnaireResponse extends HealthQuestionnaire {
	matchedSpecialties: string[];
}

export async function submitQuestionnaire(
	data: SubmitQuestionnairePayload,
): Promise<QuestionnaireResponse> {
	return apiFetch<QuestionnaireResponse>('/api/questionnaires', {
		method: 'POST',
		body: JSON.stringify(data),
	});
}

// --- Clinician Matching ---

export async function matchClinicians(
	patientId: string,
	questionnaireId: string,
): Promise<MatchedClinician[]> {
	return apiFetch<MatchedClinician[]>(
		`/api/clinicians/match?patient_id=${patientId}&questionnaire_id=${questionnaireId}`,
	);
}

// --- Clinician Detail ---

export async function getClinicianDetail(id: string): Promise<Clinician> {
	return apiFetch<Clinician>(`/api/clinicians/${id}`);
}

// --- Clinician Slots ---

export async function getClinicianSlots(
	id: string,
	from?: string,
	to?: string,
): Promise<AvailabilitySlot[]> {
	const query = new URLSearchParams();
	if (from) query.set('from', from);
	if (to) query.set('to', to);
	const qs = query.toString();
	return apiFetch<AvailabilitySlot[]>(
		`/api/clinicians/${id}/slots${qs ? `?${qs}` : ''}`,
	);
}

// --- Appointments ---

export interface BookAppointmentPayload {
	patientId: string;
	clinicianId: string;
	slotId: string;
	questionnaireId?: string;
	visitType?: VisitType;
}

export async function bookAppointment(
	data: BookAppointmentPayload,
): Promise<Appointment> {
	return apiFetch<Appointment>('/api/appointments', {
		method: 'POST',
		body: JSON.stringify(data),
	});
}

export interface ListAppointmentsParams {
	patient_id?: string;
	clinician_id?: string;
}

export async function listAppointments(
	params: ListAppointmentsParams,
): Promise<Appointment[]> {
	const query = new URLSearchParams();
	if (params.patient_id) query.set('patient_id', params.patient_id);
	if (params.clinician_id) query.set('clinician_id', params.clinician_id);
	const qs = query.toString();
	return apiFetch<Appointment[]>(`/api/appointments${qs ? `?${qs}` : ''}`);
}

export async function cancelAppointment(id: string): Promise<Appointment> {
	return apiFetch<Appointment>(`/api/appointments/${id}`, {
		method: 'PATCH',
		body: JSON.stringify({ status: 'cancelled', cancelledBy: 'patient' }),
	});
}

// --- Clinicians List ---

export async function listClinicians(): Promise<Clinician[]> {
	return apiFetch<Clinician[]>('/api/clinicians');
}
