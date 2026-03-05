/**
 * Maps symptoms and care goals to specialty names.
 * Used by both QuestionnaireService and ClinicianService.
 */

const SYMPTOM_TO_SPECIALTY: Record<string, string> = {
	hot_flashes: 'hrt',
	weight_gain: 'weight_glp1',
	mood_changes: 'mood',
	sleep_issues: 'sleep',
	low_libido: 'sexual_wellness',
	brain_fog: 'general_menopause',
	hair_thinning: 'general_menopause',
};

const GOAL_TO_SPECIALTY: Record<string, string> = {
	hormone_therapy: 'hrt',
	weight_management: 'weight_glp1',
	mood_support: 'mood',
	sleep_improvement: 'sleep',
};

export function mapSymptomsAndGoalsToSpecialties(
	symptoms: string[],
	careGoals: string[],
): string[] {
	const specialties = new Set<string>();

	for (const symptom of symptoms) {
		const specialty = SYMPTOM_TO_SPECIALTY[symptom];
		if (specialty) {
			specialties.add(specialty);
		}
	}

	for (const goal of careGoals) {
		const specialty = GOAL_TO_SPECIALTY[goal];
		if (specialty) {
			specialties.add(specialty);
		}
	}

	// If nothing mapped, fall back to general menopause
	if (specialties.size === 0) {
		specialties.add('general_menopause');
	}

	return Array.from(specialties);
}
