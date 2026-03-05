'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	createShift,
	listFacilities,
	listShifts,
} from '@/lib/api/shiftApi';
import type { Facility, Shift } from '@/types/shift';
import { useCallback, useEffect, useState } from 'react';

export default function FacilityPage() {
	const [facilities, setFacilities] = useState<Facility[]>([]);
	const [selectedFacilityId, setSelectedFacilityId] = useState('');
	const [shifts, setShifts] = useState<Shift[]>([]);
	const [loading, setLoading] = useState(true);
	const [shiftsLoading, setShiftsLoading] = useState(false);
	const [error, setError] = useState('');
	const [formError, setFormError] = useState('');
	const [submitting, setSubmitting] = useState(false);

	// Form state
	const [qualification, setQualification] = useState('CNA');
	const [startTime, setStartTime] = useState('');
	const [endTime, setEndTime] = useState('');
	const [payRate, setPayRate] = useState('');

	useEffect(() => {
		listFacilities()
			.then((data) => {
				setFacilities(data);
				if (data.length > 0) {
					setSelectedFacilityId(data[0].id);
				}
			})
			.catch((err) => setError(err.message))
			.finally(() => setLoading(false));
	}, []);

	const fetchShifts = useCallback(async () => {
		if (!selectedFacilityId) return;
		setShiftsLoading(true);
		try {
			const data = await listShifts({ status: 'all' });
			setShifts(data.filter((s) => s.facilityId === selectedFacilityId));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load shifts');
		} finally {
			setShiftsLoading(false);
		}
	}, [selectedFacilityId]);

	useEffect(() => {
		fetchShifts();
	}, [fetchShifts]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setFormError('');

		if (!selectedFacilityId) {
			setFormError('Please select a facility');
			return;
		}

		const payRateCents = Math.round(parseFloat(payRate) * 100);
		if (isNaN(payRateCents) || payRateCents <= 0) {
			setFormError('Pay rate must be a positive number');
			return;
		}

		setSubmitting(true);
		try {
			await createShift({
				facilityId: selectedFacilityId,
				qualificationRequired: qualification,
				startTime: new Date(startTime).toISOString(),
				endTime: new Date(endTime).toISOString(),
				payRateCents,
			});
			// Reset form
			setQualification('CNA');
			setStartTime('');
			setEndTime('');
			setPayRate('');
			// Refetch shifts
			await fetchShifts();
		} catch (err) {
			setFormError(err instanceof Error ? err.message : 'Failed to create shift');
		} finally {
			setSubmitting(false);
		}
	}

	function formatPayRate(cents: number): string {
		return `$${(cents / 100).toFixed(2)}`;
	}

	function formatTime(iso: string): string {
		return new Date(iso).toLocaleString();
	}

	if (loading) {
		return <p className="text-muted-foreground">Loading facilities...</p>;
	}

	if (error && facilities.length === 0) {
		return <p className="text-destructive">{error}</p>;
	}

	return (
		<div className="space-y-6">
			<h1 className="text-2xl font-bold">Facility Dashboard</h1>

			{/* Facility selector */}
			<div>
				<label
					htmlFor="facility-select"
					className="mb-1 block text-sm font-medium"
				>
					Select Facility
				</label>
				<select
					id="facility-select"
					value={selectedFacilityId}
					onChange={(e) => setSelectedFacilityId(e.target.value)}
					className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
				>
					{facilities.map((f) => (
						<option key={f.id} value={f.id}>
							{f.name}
						</option>
					))}
				</select>
			</div>

			{/* Create shift form */}
			<Card>
				<CardHeader>
					<CardTitle>Post a New Shift</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<label
									htmlFor="qualification"
									className="mb-1 block text-sm font-medium"
								>
									Qualification Required
								</label>
								<select
									id="qualification"
									value={qualification}
									onChange={(e) => setQualification(e.target.value)}
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								>
									<option value="CNA">CNA</option>
									<option value="LPN">LPN</option>
									<option value="RN">RN</option>
								</select>
							</div>
							<div>
								<label
									htmlFor="pay-rate"
									className="mb-1 block text-sm font-medium"
								>
									Pay Rate ($/hr)
								</label>
								<input
									id="pay-rate"
									type="number"
									step="0.01"
									min="0.01"
									value={payRate}
									onChange={(e) => setPayRate(e.target.value)}
									placeholder="25.00"
									required
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								/>
							</div>
							<div>
								<label
									htmlFor="start-time"
									className="mb-1 block text-sm font-medium"
								>
									Start Time
								</label>
								<input
									id="start-time"
									type="datetime-local"
									value={startTime}
									onChange={(e) => setStartTime(e.target.value)}
									required
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								/>
							</div>
							<div>
								<label
									htmlFor="end-time"
									className="mb-1 block text-sm font-medium"
								>
									End Time
								</label>
								<input
									id="end-time"
									type="datetime-local"
									value={endTime}
									onChange={(e) => setEndTime(e.target.value)}
									required
									className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								/>
							</div>
						</div>

						{formError && (
							<p className="text-sm text-destructive">{formError}</p>
						)}

						<Button type="submit" disabled={submitting}>
							{submitting ? 'Posting...' : 'Post Shift'}
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* Shift list */}
			<Card>
				<CardHeader>
					<CardTitle>Shifts</CardTitle>
				</CardHeader>
				<CardContent>
					{shiftsLoading ? (
						<p className="text-muted-foreground">Loading shifts...</p>
					) : shifts.length === 0 ? (
						<p className="text-muted-foreground">
							No shifts posted yet. Use the form above to post one.
						</p>
					) : (
						<div className="space-y-3">
							{shifts.map((shift) => (
								<div
									key={shift.id}
									className="flex items-center justify-between rounded-lg border p-4"
								>
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<span className="font-medium">
												{shift.qualificationRequired}
											</span>
											<Badge
												variant={
													shift.status === 'open' ? 'default' : 'secondary'
												}
											>
												{shift.status}
											</Badge>
										</div>
										<p className="text-sm text-muted-foreground">
											{formatTime(shift.startTime)} &ndash;{' '}
											{formatTime(shift.endTime)}
										</p>
										<p className="text-sm">
											{formatPayRate(shift.payRateCents)}/hr
										</p>
										{shift.booking?.professional && (
											<p className="text-sm text-muted-foreground">
												Booked by: {shift.booking.professional.name}
											</p>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{error && shifts.length > 0 && (
				<p className="text-sm text-destructive">{error}</p>
			)}
		</div>
	);
}
