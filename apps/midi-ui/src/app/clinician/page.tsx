'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	cancelAppointment,
	completeAppointment,
	listAppointments,
	listClinicians,
} from '@/lib/api/midiApi';
import type { Appointment, Clinician } from '@/types';
import { useCallback, useEffect, useState } from 'react';

const STATUS_BADGE_CLASS: Record<string, string> = {
	scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
	completed: 'bg-green-100 text-green-800 border-green-200',
	cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
	no_show: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_LABEL: Record<string, string> = {
	scheduled: 'Scheduled',
	completed: 'Completed',
	cancelled: 'Cancelled',
	no_show: 'No Show',
};

export default function ClinicianDashboardPage() {
	const [clinicians, setClinicians] = useState<Clinician[]>([]);
	const [selectedClinicianId, setSelectedClinicianId] = useState('');
	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [actionLoading, setActionLoading] = useState<string | null>(null);

	useEffect(() => {
		listClinicians()
			.then(setClinicians)
			.catch(() => setError('Failed to load clinicians'));
	}, []);

	const fetchAppointments = useCallback(async (clinicianId: string) => {
		setLoading(true);
		setError(null);
		try {
			const appts = await listAppointments({ clinician_id: clinicianId });
			setAppointments(appts);
		} catch {
			setError('Failed to load appointments');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (selectedClinicianId) {
			fetchAppointments(selectedClinicianId);
		} else {
			setAppointments([]);
		}
	}, [selectedClinicianId, fetchAppointments]);

	const handleCancel = async (appointmentId: string) => {
		setActionLoading(appointmentId);
		setError(null);
		try {
			await cancelAppointment(appointmentId, 'clinician');
			await fetchAppointments(selectedClinicianId);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to cancel appointment',
			);
		} finally {
			setActionLoading(null);
		}
	};

	const handleComplete = async (appointmentId: string) => {
		setActionLoading(appointmentId);
		setError(null);
		try {
			await completeAppointment(appointmentId);
			await fetchAppointments(selectedClinicianId);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to complete appointment',
			);
		} finally {
			setActionLoading(null);
		}
	};

	const selectedClinician = clinicians.find(
		(c) => c.id === selectedClinicianId,
	);

	return (
		<div>
			<h1 className="mb-6 text-2xl font-bold">Clinician Dashboard</h1>

			{/* Clinician Selector */}
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>Select Clinician</CardTitle>
				</CardHeader>
				<CardContent>
					<select
						className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						value={selectedClinicianId}
						onChange={(e) => setSelectedClinicianId(e.target.value)}
					>
						<option value="">Choose a clinician...</option>
						{clinicians.map((c) => (
							<option key={c.id} value={c.id}>
								{c.firstName} {c.lastName}, {c.credential}
							</option>
						))}
					</select>
				</CardContent>
			</Card>

			{selectedClinician && (
				<>
					{/* Profile Section */}
					<Card className="mb-6">
						<CardHeader>
							<CardTitle>
								{selectedClinician.firstName} {selectedClinician.lastName},{' '}
								{selectedClinician.credential}
							</CardTitle>
							<CardDescription>
								{selectedClinician.yearsExperience != null &&
									`${selectedClinician.yearsExperience} years experience`}
								{selectedClinician.rating != null &&
									` · Rating: ${selectedClinician.rating}/5.0`}
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-3">
							{selectedClinician.clinicianSpecialties &&
								selectedClinician.clinicianSpecialties.length > 0 && (
									<div>
										<p className="mb-1 text-sm font-medium">Specialties</p>
										<div className="flex flex-wrap gap-1.5">
											{selectedClinician.clinicianSpecialties.map((cs) => (
												<Badge
													key={cs.specialtyId}
													variant={cs.isPrimary ? 'default' : 'secondary'}
												>
													{cs.specialty.displayName}
												</Badge>
											))}
										</div>
									</div>
								)}

							{selectedClinician.stateLicenses &&
								selectedClinician.stateLicenses.length > 0 && (
									<div>
										<p className="mb-1 text-sm font-medium">Licensed States</p>
										<div className="flex flex-wrap gap-1.5">
											{selectedClinician.stateLicenses.map((sl) => (
												<Badge key={sl.id} variant="outline">
													{sl.state}
												</Badge>
											))}
										</div>
									</div>
								)}
						</CardContent>
					</Card>

					{/* Appointments Section */}
					<div>
						<h2 className="mb-4 text-xl font-semibold">Appointments</h2>

						{error && <p className="mb-4 text-sm text-destructive">{error}</p>}

						{loading ? (
							<p className="text-muted-foreground">Loading appointments...</p>
						) : appointments.length === 0 ? (
							<Card>
								<CardContent className="py-8 text-center text-muted-foreground">
									No appointments found.
								</CardContent>
							</Card>
						) : (
							<div className="space-y-3">
								{appointments.map((appt) => (
									<Card key={appt.id}>
										<CardContent className="flex items-center justify-between py-4">
											<div className="space-y-1">
												<p className="font-medium">
													{appt.patient
														? `${appt.patient.firstName} ${appt.patient.lastName}`
														: 'Unknown Patient'}
												</p>
												<p className="text-sm text-muted-foreground">
													{appt.slot
														? `${new Date(
																appt.slot.startTime,
														  ).toLocaleDateString()} ${new Date(
																appt.slot.startTime,
														  ).toLocaleTimeString([], {
																hour: '2-digit',
																minute: '2-digit',
														  })} – ${new Date(
																appt.slot.endTime,
														  ).toLocaleTimeString([], {
																hour: '2-digit',
																minute: '2-digit',
														  })}`
														: 'Time not available'}
												</p>
												<p className="text-sm text-muted-foreground">
													{appt.visitType.replace(/_/g, ' ')}
												</p>
											</div>
											<div className="flex items-center gap-2">
												<Badge
													variant="outline"
													className={STATUS_BADGE_CLASS[appt.status] ?? ''}
												>
													{STATUS_LABEL[appt.status] ?? appt.status}
												</Badge>
												{appt.status === 'scheduled' && (
													<>
														<Button
															variant="outline"
															size="sm"
															disabled={actionLoading === appt.id}
															onClick={() => handleComplete(appt.id)}
														>
															{actionLoading === appt.id ? '...' : 'Complete'}
														</Button>
														<Button
															variant="destructive"
															size="sm"
															disabled={actionLoading === appt.id}
															onClick={() => handleCancel(appt.id)}
														>
															{actionLoading === appt.id ? '...' : 'Cancel'}
														</Button>
													</>
												)}
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}
					</div>
				</>
			)}
		</div>
	);
}
