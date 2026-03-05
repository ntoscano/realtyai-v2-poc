'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	bookShift,
	listProfessionals,
	listShifts,
} from '@/lib/api/shiftApi';
import type { ApiError } from '@/lib/api/shiftApi';
import type { Professional, Shift } from '@/types/shift';
import { useCallback, useEffect, useState } from 'react';

export default function ProfessionalPage() {
	const [professionals, setProfessionals] = useState<Professional[]>([]);
	const [selectedProfessionalId, setSelectedProfessionalId] = useState('');
	const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
	const [bookedShifts, setBookedShifts] = useState<Shift[]>([]);
	const [loading, setLoading] = useState(true);
	const [shiftsLoading, setShiftsLoading] = useState(false);
	const [error, setError] = useState('');
	const [bookingErrors, setBookingErrors] = useState<Record<string, string>>(
		{},
	);
	const [bookingInProgress, setBookingInProgress] = useState<
		Record<string, boolean>
	>({});

	const selectedProfessional = professionals.find(
		(p) => p.id === selectedProfessionalId,
	);

	useEffect(() => {
		listProfessionals()
			.then((data) => {
				setProfessionals(data);
				if (data.length > 0) {
					setSelectedProfessionalId(data[0].id);
				}
			})
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, []);

	const fetchShifts = useCallback(async () => {
		if (!selectedProfessionalId || !selectedProfessional) return;
		setShiftsLoading(true);
		setBookingErrors({});
		try {
			const [available, booked] = await Promise.all([
				listShifts({
					status: 'open',
					qualification: selectedProfessional.qualification,
				}),
				listShifts({ status: 'booked' }),
			]);
			setAvailableShifts(available);
			setBookedShifts(
				booked.filter(
					(s) => s.booking?.professionalId === selectedProfessionalId,
				),
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load shifts');
		} finally {
			setShiftsLoading(false);
		}
	}, [selectedProfessionalId, selectedProfessional]);

	useEffect(() => {
		fetchShifts();
	}, [fetchShifts]);

	async function handleBook(shiftId: string) {
		setBookingErrors((prev) => {
			const next = { ...prev };
			delete next[shiftId];
			return next;
		});
		setBookingInProgress((prev) => ({ ...prev, [shiftId]: true }));

		try {
			await bookShift(shiftId, selectedProfessionalId);
			await fetchShifts();
		} catch (err) {
			const apiError = err as ApiError;
			const message =
				apiError.message ?? 'Failed to book shift';
			setBookingErrors((prev) => ({ ...prev, [shiftId]: message }));
		} finally {
			setBookingInProgress((prev) => ({ ...prev, [shiftId]: false }));
		}
	}

	function formatPayRate(cents: number): string {
		return `$${(cents / 100).toFixed(2)}`;
	}

	function formatTime(iso: string): string {
		return new Date(iso).toLocaleString();
	}

	if (loading) {
		return <p className="text-muted-foreground">Loading professionals...</p>;
	}

	if (error && professionals.length === 0) {
		return <p className="text-destructive">{error}</p>;
	}

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">Professional Dashboard</h1>

			{/* Professional selector */}
			<div>
				<label
					htmlFor="professional-select"
					className="mb-1 block text-sm font-medium"
				>
					Select Professional
				</label>
				<select
					id="professional-select"
					value={selectedProfessionalId}
					onChange={(e) => setSelectedProfessionalId(e.target.value)}
					className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
				>
					{professionals.map((p) => (
						<option key={p.id} value={p.id}>
							{p.name} ({p.qualification})
						</option>
					))}
				</select>
			</div>

			{/* Available shifts */}
			<Card>
				<CardHeader>
					<CardTitle>
						Available Shifts
						{selectedProfessional && (
							<span className="ml-2 text-sm font-normal text-muted-foreground">
								(matching {selectedProfessional.qualification})
							</span>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent>
					{shiftsLoading ? (
						<p className="text-muted-foreground">Loading shifts...</p>
					) : availableShifts.length === 0 ? (
						<p className="text-muted-foreground">
							No available shifts matching your qualification.
						</p>
					) : (
						<div className="space-y-3">
							{availableShifts.map((shift) => (
								<div
									key={shift.id}
									className="flex items-center justify-between rounded-lg border p-4"
								>
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<span className="font-medium">
												{shift.facility?.name ?? 'Unknown Facility'}
											</span>
											<Badge variant="default">
												{shift.qualificationRequired}
											</Badge>
										</div>
										<p className="text-sm text-muted-foreground">
											{formatTime(shift.startTime)} &ndash;{' '}
											{formatTime(shift.endTime)}
										</p>
										<p className="text-sm">
											{formatPayRate(shift.payRateCents)}/hr
										</p>
										{bookingErrors[shift.id] && (
											<p className="text-sm text-destructive">
												{bookingErrors[shift.id]}
											</p>
										)}
									</div>
									<Button
										onClick={() => handleBook(shift.id)}
										disabled={bookingInProgress[shift.id]}
										size="sm"
									>
										{bookingInProgress[shift.id] ? 'Booking...' : 'Book'}
									</Button>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* My shifts (booked) */}
			<Card>
				<CardHeader>
					<CardTitle>My Shifts</CardTitle>
				</CardHeader>
				<CardContent>
					{shiftsLoading ? (
						<p className="text-muted-foreground">Loading shifts...</p>
					) : bookedShifts.length === 0 ? (
						<p className="text-muted-foreground">
							You have no booked shifts yet.
						</p>
					) : (
						<div className="space-y-3">
							{bookedShifts.map((shift) => (
								<div
									key={shift.id}
									className="flex items-center justify-between rounded-lg border p-4"
								>
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<span className="font-medium">
												{shift.facility?.name ?? 'Unknown Facility'}
											</span>
											<Badge variant="secondary">booked</Badge>
										</div>
										<p className="text-sm text-muted-foreground">
											{formatTime(shift.startTime)} &ndash;{' '}
											{formatTime(shift.endTime)}
										</p>
										<p className="text-sm">
											{formatPayRate(shift.payRateCents)}/hr
										</p>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{error && professionals.length > 0 && (
				<p className="text-sm text-destructive">{error}</p>
			)}
		</div>
	);
}
