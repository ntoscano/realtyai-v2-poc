'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	bookAppointment,
	getClinicianDetail,
	getClinicianSlots,
} from '@/lib/api/telehealthApi';
import type { ApiError } from '@/lib/api/telehealthApi';
import type { Appointment, AvailabilitySlot, Clinician } from '@/types';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

function groupSlotsByDate(
	slots: AvailabilitySlot[],
): Map<string, AvailabilitySlot[]> {
	const grouped = new Map<string, AvailabilitySlot[]>();
	for (const slot of slots) {
		const dateKey = new Date(slot.startTime).toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
		const existing = grouped.get(dateKey) ?? [];
		existing.push(slot);
		grouped.set(dateKey, existing);
	}
	return grouped;
}

function formatTime(iso: string): string {
	return new Date(iso).toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
	});
}

export default function BookingPage() {
	const params = useParams();
	const searchParams = useSearchParams();

	const clinicianId = params.clinicianId as string;
	const patientId = searchParams.get('patient_id') ?? '';
	const questionnaireId = searchParams.get('questionnaire_id') ?? '';

	const [clinician, setClinician] = useState<Clinician | null>(null);
	const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [bookingSlotId, setBookingSlotId] = useState<string | null>(null);
	const [confirmation, setConfirmation] = useState<Appointment | null>(null);

	const loadData = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [clinicianData, slotsData] = await Promise.all([
				getClinicianDetail(clinicianId),
				getClinicianSlots(clinicianId),
			]);
			setClinician(clinicianData);
			setSlots(slotsData);
		} catch {
			setError('Failed to load clinician data');
		} finally {
			setLoading(false);
		}
	}, [clinicianId]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const handleBookSlot = async (slotId: string) => {
		setBookingSlotId(slotId);
		setError(null);

		try {
			const appointment = await bookAppointment({
				patientId,
				clinicianId,
				slotId,
				questionnaireId: questionnaireId || undefined,
				visitType: 'initial_consultation',
			});
			setConfirmation(appointment);
		} catch (err) {
			const apiErr = err as ApiError;
			if (apiErr.status === 409) {
				setError('This time slot is no longer available. Refreshing slots...');
				const refreshed = await getClinicianSlots(clinicianId);
				setSlots(refreshed);
			} else {
				setError(
					err instanceof Error ? err.message : 'An unexpected error occurred',
				);
			}
		} finally {
			setBookingSlotId(null);
		}
	};

	if (loading) {
		return <p className="text-center text-muted-foreground">Loading...</p>;
	}

	if (confirmation && clinician) {
		return (
			<div className="mx-auto max-w-lg">
				<Card>
					<CardHeader>
						<CardTitle className="text-center text-green-600">
							Appointment Confirmed
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Clinician</span>
							<span className="font-medium">
								{clinician.firstName} {clinician.lastName},{' '}
								{clinician.credential}
							</span>
						</div>
						{confirmation.slot && (
							<>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Date</span>
									<span className="font-medium">
										{new Date(confirmation.slot.startTime).toLocaleDateString(
											'en-US',
											{
												weekday: 'long',
												year: 'numeric',
												month: 'long',
												day: 'numeric',
											},
										)}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Time</span>
									<span className="font-medium">
										{formatTime(confirmation.slot.startTime)} &ndash;{' '}
										{formatTime(confirmation.slot.endTime)}
									</span>
								</div>
							</>
						)}
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Status</span>
							<Badge>{confirmation.status}</Badge>
						</div>
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Visit Type</span>
							<span className="font-medium">
								{confirmation.visitType.replace(/_/g, ' ')}
							</span>
						</div>
					</CardContent>
					<CardFooter className="flex gap-3">
						<Link href="/questionnaire">
							<Button variant="outline">Back to Questionnaire</Button>
						</Link>
					</CardFooter>
				</Card>
			</div>
		);
	}

	if (!clinician) {
		return (
			<p className="text-center text-destructive">
				{error ?? 'Clinician not found'}
			</p>
		);
	}

	const groupedSlots = groupSlotsByDate(slots);

	return (
		<div>
			{/* Clinician Info */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>
						{clinician.firstName} {clinician.lastName}, {clinician.credential}
					</CardTitle>
					<CardDescription>
						{clinician.yearsExperience != null &&
							`${clinician.yearsExperience} years experience`}
						{clinician.rating != null && ` · Rating: ${clinician.rating}/5.0`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{clinician.clinicianSpecialties &&
						clinician.clinicianSpecialties.length > 0 && (
							<div className="mb-3 flex flex-wrap gap-1.5">
								{clinician.clinicianSpecialties.map((cs) => (
									<Badge key={cs.specialtyId} variant="secondary">
										{cs.specialty.displayName}
									</Badge>
								))}
							</div>
						)}
					{clinician.bio && (
						<p className="text-sm text-muted-foreground">{clinician.bio}</p>
					)}
				</CardContent>
			</Card>

			{/* Available Time Slots */}
			<h2 className="mb-4 text-xl font-semibold">Available Time Slots</h2>

			{error && <p className="mb-4 text-sm text-destructive">{error}</p>}

			{slots.length === 0 ? (
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						No available slots for this clinician. Please check back later.
					</CardContent>
				</Card>
			) : (
				<div className="space-y-6">
					{Array.from(groupedSlots.entries()).map(([date, dateSlots]) => (
						<Card key={date}>
							<CardHeader>
								<CardTitle className="text-base">{date}</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex flex-wrap gap-2">
									{dateSlots.map((slot) => (
										<Button
											key={slot.id}
											variant="outline"
											size="sm"
											disabled={bookingSlotId !== null}
											onClick={() => handleBookSlot(slot.id)}
										>
											{bookingSlotId === slot.id
												? 'Booking...'
												: `${formatTime(slot.startTime)} – ${formatTime(
														slot.endTime,
												  )}`}
										</Button>
									))}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
