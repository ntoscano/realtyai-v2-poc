import type { Facility, Professional, Shift } from '@/types/shift';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003';

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

export async function listFacilities(): Promise<Facility[]> {
	return apiFetch<Facility[]>('/api/facilities');
}

export async function listProfessionals(): Promise<Professional[]> {
	return apiFetch<Professional[]>('/api/professionals');
}

export interface CreateShiftPayload {
	facilityId: string;
	qualificationRequired: string;
	startTime: string;
	endTime: string;
	payRateCents: number;
}

export async function createShift(payload: CreateShiftPayload): Promise<Shift> {
	return apiFetch<Shift>('/api/shifts', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export interface ListShiftsParams {
	status?: string;
	qualification?: string;
}

export async function listShifts(params?: ListShiftsParams): Promise<Shift[]> {
	const query = new URLSearchParams();
	if (params?.status) query.set('status', params.status);
	if (params?.qualification) query.set('qualification', params.qualification);
	const qs = query.toString();
	return apiFetch<Shift[]>(`/api/shifts${qs ? `?${qs}` : ''}`);
}

export async function getShift(id: string): Promise<Shift> {
	return apiFetch<Shift>(`/api/shifts/${id}`);
}

export async function bookShift(
	shiftId: string,
	professionalId: string,
): Promise<Shift> {
	return apiFetch<Shift>(`/api/shifts/${shiftId}/book`, {
		method: 'POST',
		body: JSON.stringify({ professionalId }),
	});
}
