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
	listPatients,
	matchClinicians,
	submitQuestionnaire,
} from '@/lib/api/midiApi';
import type {
	CareGoal,
	MatchedClinician,
	MenopauseStage,
	Patient,
	Severity,
	Symptom,
} from '@/types';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

const SYMPTOM_OPTIONS: { value: Symptom; label: string }[] = [
	{ value: 'hot_flashes', label: 'Hot Flashes' },
	{ value: 'weight_gain', label: 'Weight Gain' },
	{ value: 'mood_changes', label: 'Mood Changes' },
	{ value: 'sleep_issues', label: 'Sleep Issues' },
	{ value: 'low_libido', label: 'Low Libido' },
	{ value: 'brain_fog', label: 'Brain Fog' },
	{ value: 'hair_thinning', label: 'Hair Thinning' },
];

const CARE_GOAL_OPTIONS: { value: CareGoal; label: string }[] = [
	{ value: 'hormone_therapy', label: 'Hormone Therapy' },
	{ value: 'weight_management', label: 'Weight Management' },
	{ value: 'mood_support', label: 'Mood Support' },
	{ value: 'sleep_improvement', label: 'Sleep Improvement' },
];

const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
	{ value: 'mild', label: 'Mild' },
	{ value: 'moderate', label: 'Moderate' },
	{ value: 'severe', label: 'Severe' },
];

const MENOPAUSE_STAGE_OPTIONS: {
	value: MenopauseStage;
	label: string;
}[] = [
	{ value: 'perimenopause', label: 'Perimenopause' },
	{ value: 'menopause', label: 'Menopause' },
	{ value: 'post_menopause', label: 'Post-Menopause' },
];

export default function QuestionnairePage() {
	const [patients, setPatients] = useState<Patient[]>([]);
	const [selectedPatientId, setSelectedPatientId] = useState('');
	const [symptoms, setSymptoms] = useState<Symptom[]>([]);
	const [severity, setSeverity] = useState<Severity>('moderate');
	const [careGoals, setCareGoals] = useState<CareGoal[]>([]);
	const [menopauseStage, setMenopauseStage] = useState<MenopauseStage | ''>('');
	const [additionalNotes, setAdditionalNotes] = useState('');

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [matchedClinicians, setMatchedClinicians] = useState<
		MatchedClinician[] | null
	>(null);
	const [questionnaireId, setQuestionnaireId] = useState<string | null>(null);

	useEffect(() => {
		listPatients()
			.then(setPatients)
			.catch(() => setError('Failed to load patients'));
	}, []);

	const toggleSymptom = useCallback((symptom: Symptom) => {
		setSymptoms((prev) =>
			prev.includes(symptom)
				? prev.filter((s) => s !== symptom)
				: [...prev, symptom],
		);
	}, []);

	const toggleCareGoal = useCallback((goal: CareGoal) => {
		setCareGoals((prev) =>
			prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
		);
	}, []);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedPatientId || symptoms.length === 0 || careGoals.length === 0) {
			setError(
				'Please select a patient, at least one symptom, and at least one care goal.',
			);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const qResponse = await submitQuestionnaire({
				patientId: selectedPatientId,
				symptoms,
				severity,
				careGoals,
				menopauseStage: menopauseStage || undefined,
				additionalNotes: additionalNotes || undefined,
			});

			setQuestionnaireId(qResponse.id);

			const matched = await matchClinicians(selectedPatientId, qResponse.id);
			setMatchedClinicians(matched);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'An unexpected error occurred',
			);
		} finally {
			setLoading(false);
		}
	};

	const handleStartOver = () => {
		setMatchedClinicians(null);
		setQuestionnaireId(null);
		setSymptoms([]);
		setCareGoals([]);
		setSeverity('moderate');
		setMenopauseStage('');
		setAdditionalNotes('');
		setError(null);
	};

	const selectedPatient = patients.find((p) => p.id === selectedPatientId);

	if (matchedClinicians !== null) {
		return (
			<div>
				<div className="mb-6 flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">Matched Clinicians</h1>
						{selectedPatient && (
							<p className="text-sm text-muted-foreground">
								Results for {selectedPatient.firstName}{' '}
								{selectedPatient.lastName} ({selectedPatient.state})
							</p>
						)}
					</div>
					<Button variant="outline" onClick={handleStartOver}>
						New Questionnaire
					</Button>
				</div>

				{matchedClinicians.length === 0 ? (
					<Card>
						<CardContent className="py-8 text-center text-muted-foreground">
							No clinicians found matching your criteria in your state. Please
							try adjusting your symptoms or care goals.
						</CardContent>
					</Card>
				) : (
					<div className="space-y-4">
						{matchedClinicians.map((clinician) => (
							<Card key={clinician.id}>
								<CardHeader>
									<div className="flex items-start justify-between">
										<div>
											<CardTitle>{clinician.name}</CardTitle>
											<CardDescription>
												{clinician.yearsExperience != null &&
													`${clinician.yearsExperience} years experience`}
												{clinician.rating != null &&
													` · Rating: ${clinician.rating}/5.0`}
											</CardDescription>
										</div>
										<Badge>
											{Math.round(clinician.matchScore * 100)}% Match
										</Badge>
									</div>
								</CardHeader>
								<CardContent>
									<div className="flex flex-wrap gap-1.5">
										{clinician.specialties.map((spec) => (
											<Badge
												key={spec}
												variant={
													clinician.matchingSpecialties.includes(spec)
														? 'default'
														: 'secondary'
												}
											>
												{spec.replace(/_/g, ' ')}
											</Badge>
										))}
									</div>
									{clinician.bio && (
										<p className="mt-3 text-sm text-muted-foreground">
											{clinician.bio}
										</p>
									)}
									<div className="mt-3 text-sm text-muted-foreground">
										{clinician.availableSlotCount > 0 ? (
											<>
												{clinician.availableSlotCount} slot
												{clinician.availableSlotCount !== 1 && 's'} available
												{clinician.nextAvailable &&
													` · Next: ${new Date(
														clinician.nextAvailable,
													).toLocaleDateString()}`}
											</>
										) : (
											'No available slots'
										)}
									</div>
								</CardContent>
								<CardFooter>
									{clinician.availableSlotCount > 0 ? (
										<Link
											href={`/book/${clinician.id}?patient_id=${selectedPatientId}&questionnaire_id=${questionnaireId}`}
										>
											<Button>View Available Times</Button>
										</Link>
									) : (
										<Button disabled>No Slots Available</Button>
									)}
								</CardFooter>
							</Card>
						))}
					</div>
				)}
			</div>
		);
	}

	return (
		<div>
			<h1 className="mb-6 text-2xl font-bold">Health Questionnaire</h1>

			<form onSubmit={handleSubmit} className="space-y-6">
				{/* Patient Selector */}
				<Card>
					<CardHeader>
						<CardTitle>Select Patient</CardTitle>
					</CardHeader>
					<CardContent>
						<select
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							value={selectedPatientId}
							onChange={(e) => setSelectedPatientId(e.target.value)}
						>
							<option value="">Choose a patient...</option>
							{patients.map((p) => (
								<option key={p.id} value={p.id}>
									{p.firstName} {p.lastName} ({p.state})
								</option>
							))}
						</select>
					</CardContent>
				</Card>

				{/* Symptoms */}
				<Card>
					<CardHeader>
						<CardTitle>Symptoms</CardTitle>
						<CardDescription>
							Select all symptoms that apply (at least one required)
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
							{SYMPTOM_OPTIONS.map((opt) => (
								<label
									key={opt.value}
									className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
								>
									<input
										type="checkbox"
										className="accent-primary"
										checked={symptoms.includes(opt.value)}
										onChange={() => toggleSymptom(opt.value)}
									/>
									{opt.label}
								</label>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Severity */}
				<Card>
					<CardHeader>
						<CardTitle>Severity</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex gap-4">
							{SEVERITY_OPTIONS.map((opt) => (
								<label
									key={opt.value}
									className="flex cursor-pointer items-center gap-2 text-sm"
								>
									<input
										type="radio"
										name="severity"
										className="accent-primary"
										checked={severity === opt.value}
										onChange={() => setSeverity(opt.value)}
									/>
									{opt.label}
								</label>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Care Goals */}
				<Card>
					<CardHeader>
						<CardTitle>Care Goals</CardTitle>
						<CardDescription>
							Select your care goals (at least one required)
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-3">
							{CARE_GOAL_OPTIONS.map((opt) => (
								<label
									key={opt.value}
									className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
								>
									<input
										type="checkbox"
										className="accent-primary"
										checked={careGoals.includes(opt.value)}
										onChange={() => toggleCareGoal(opt.value)}
									/>
									{opt.label}
								</label>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Menopause Stage */}
				<Card>
					<CardHeader>
						<CardTitle>Menopause Stage</CardTitle>
						<CardDescription>Optional</CardDescription>
					</CardHeader>
					<CardContent>
						<select
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							value={menopauseStage}
							onChange={(e) =>
								setMenopauseStage(e.target.value as MenopauseStage | '')
							}
						>
							<option value="">Select stage (optional)</option>
							{MENOPAUSE_STAGE_OPTIONS.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					</CardContent>
				</Card>

				{/* Additional Notes */}
				<Card>
					<CardHeader>
						<CardTitle>Additional Notes</CardTitle>
						<CardDescription>Optional</CardDescription>
					</CardHeader>
					<CardContent>
						<textarea
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							rows={3}
							placeholder="Any additional information you'd like to share..."
							value={additionalNotes}
							onChange={(e) => setAdditionalNotes(e.target.value)}
						/>
					</CardContent>
				</Card>

				{error && <p className="text-sm text-destructive">{error}</p>}

				<Button type="submit" disabled={loading} className="w-full">
					{loading ? 'Submitting...' : 'Find Matching Clinicians'}
				</Button>
			</form>
		</div>
	);
}
