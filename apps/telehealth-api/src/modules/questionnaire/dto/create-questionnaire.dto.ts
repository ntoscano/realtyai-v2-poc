import {
	IsUUID,
	IsArray,
	ArrayMinSize,
	IsIn,
	IsOptional,
	IsBoolean,
	IsString,
} from 'class-validator';

const VALID_SYMPTOMS = [
	'hot_flashes',
	'weight_gain',
	'mood_changes',
	'sleep_issues',
	'low_libido',
	'brain_fog',
	'hair_thinning',
] as const;

const VALID_CARE_GOALS = [
	'hormone_therapy',
	'weight_management',
	'mood_support',
	'sleep_improvement',
] as const;

const VALID_SEVERITIES = ['mild', 'moderate', 'severe'] as const;

const VALID_MENOPAUSE_STAGES = [
	'perimenopause',
	'menopause',
	'post_menopause',
] as const;

export class CreateQuestionnaireDto {
	@IsUUID()
	patientId: string;

	@IsArray()
	@ArrayMinSize(1)
	@IsIn(VALID_SYMPTOMS, { each: true })
	symptoms: string[];

	@IsIn(VALID_SEVERITIES)
	severity: string;

	@IsArray()
	@ArrayMinSize(1)
	@IsIn(VALID_CARE_GOALS, { each: true })
	careGoals: string[];

	@IsOptional()
	@IsIn(VALID_MENOPAUSE_STAGES)
	menopauseStage?: string;

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	currentMedications?: string[];

	@IsOptional()
	@IsBoolean()
	hasPriorHrt?: boolean;

	@IsOptional()
	@IsString()
	additionalNotes?: string;
}
