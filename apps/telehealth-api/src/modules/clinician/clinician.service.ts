import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Clinician } from './entities/clinician.entity';
import { Specialty } from './entities/specialty.entity';
import { ClinicianSpecialty } from './entities/clinician-specialty.entity';
import { StateLicense } from './entities/state-license.entity';
import { AvailabilitySlot } from '../appointment/entities/availability-slot.entity';
import { Patient } from '../patient/entities/patient.entity';
import { HealthQuestionnaire } from '../questionnaire/entities/health-questionnaire.entity';
import { mapSymptomsAndGoalsToSpecialties } from '../../shared/symptom-specialty-map';

export interface MatchedClinicianResult {
	id: string;
	name: string;
	credential: string;
	specialties: string[];
	matchingSpecialties: string[];
	matchScore: number;
	yearsExperience: number | null;
	rating: number | null;
	availableSlotCount: number;
	nextAvailable: Date | null;
	bio: string | null;
}

@Injectable()
export class ClinicianService {
	constructor(
		@InjectRepository(Clinician)
		private readonly clinicianRepo: Repository<Clinician>,
		@InjectRepository(Specialty)
		private readonly specialtyRepo: Repository<Specialty>,
		@InjectRepository(ClinicianSpecialty)
		private readonly clinicianSpecialtyRepo: Repository<ClinicianSpecialty>,
		@InjectRepository(StateLicense)
		private readonly stateLicenseRepo: Repository<StateLicense>,
		@InjectRepository(AvailabilitySlot)
		private readonly availabilitySlotRepo: Repository<AvailabilitySlot>,
		@InjectRepository(Patient)
		private readonly patientRepo: Repository<Patient>,
		@InjectRepository(HealthQuestionnaire)
		private readonly questionnaireRepo: Repository<HealthQuestionnaire>,
	) {}

	async matchClinicians(
		patientId: string,
		questionnaireId: string,
	): Promise<MatchedClinicianResult[]> {
		// 1. Load patient to get state
		const patient = await this.patientRepo.findOne({
			where: { id: patientId },
		});
		if (!patient) {
			throw new NotFoundException(`Patient with id ${patientId} not found`);
		}

		// 2. Load questionnaire and compute needed specialties
		const questionnaire = await this.questionnaireRepo.findOne({
			where: { id: questionnaireId },
		});
		if (!questionnaire) {
			throw new NotFoundException(
				`Questionnaire with id ${questionnaireId} not found`,
			);
		}

		const neededSpecialties = mapSymptomsAndGoalsToSpecialties(
			questionnaire.symptoms,
			questionnaire.careGoals,
		);

		// 3. Find all active, accepting clinicians with valid licenses in patient's state
		const now = new Date();
		const clinicians = await this.clinicianRepo
			.createQueryBuilder('clinician')
			.innerJoin(
				'clinician.stateLicenses',
				'license',
				'license.state = :state AND license.isVerified = true AND license.expirationDate > :now',
				{ state: patient.state, now: now.toISOString().split('T')[0] },
			)
			.innerJoinAndSelect('clinician.clinicianSpecialties', 'cs')
			.innerJoinAndSelect('cs.specialty', 'specialty')
			.where('clinician.isActive = :isActive', { isActive: true })
			.andWhere('clinician.isAcceptingPatients = :isAccepting', {
				isAccepting: true,
			})
			.getMany();

		// 4. Filter to clinicians who have at least one matching specialty
		const matchedClinicians: Array<{
			clinician: Clinician;
			matchingSpecialties: string[];
			allSpecialties: string[];
		}> = [];

		for (const clinician of clinicians) {
			const clinicianSpecialtyNames = clinician.clinicianSpecialties.map(
				(cs) => cs.specialty.name,
			);
			const matching = neededSpecialties.filter((s) =>
				clinicianSpecialtyNames.includes(s),
			);

			if (matching.length > 0) {
				matchedClinicians.push({
					clinician,
					matchingSpecialties: matching,
					allSpecialties: clinicianSpecialtyNames,
				});
			}
		}

		// 5. Get availability data for matched clinicians
		const results: MatchedClinicianResult[] = [];

		for (const {
			clinician,
			matchingSpecialties,
			allSpecialties,
		} of matchedClinicians) {
			const availableSlots = await this.availabilitySlotRepo.find({
				where: {
					clinicianId: clinician.id,
					isBooked: false,
					startTime: MoreThan(now),
				},
				order: { startTime: 'ASC' },
			});

			const availableSlotCount = availableSlots.length;
			const nextAvailable =
				availableSlots.length > 0 ? availableSlots[0].startTime : null;

			results.push({
				id: clinician.id,
				name: `${clinician.firstName} ${clinician.lastName}, ${clinician.credential}`,
				credential: clinician.credential,
				specialties: allSpecialties,
				matchingSpecialties,
				matchScore: 0, // computed below
				yearsExperience: clinician.yearsExperience,
				rating: clinician.rating ? Number(clinician.rating) : null,
				availableSlotCount,
				nextAvailable,
				bio: clinician.bio,
			});
		}

		// 6. Compute match scores
		const maxAvailable =
			results.length > 0
				? Math.max(...results.map((r) => r.availableSlotCount), 1)
				: 1;

		for (const result of results) {
			const specialtyScore =
				result.matchingSpecialties.length / neededSpecialties.length;
			const availabilityScore = result.availableSlotCount / maxAvailable;
			const ratingScore = result.rating ? result.rating / 5.0 : 0;
			const experienceScore = result.yearsExperience
				? Math.min(result.yearsExperience / 20, 1.0)
				: 0;

			result.matchScore =
				0.5 * specialtyScore +
				0.2 * availabilityScore +
				0.2 * ratingScore +
				0.1 * experienceScore;

			// Round to 4 decimal places
			result.matchScore = Math.round(result.matchScore * 10000) / 10000;
		}

		// 7. Sort by match score DESC and return top 10
		results.sort((a, b) => b.matchScore - a.matchScore);
		return results.slice(0, 10);
	}

	async findOne(id: string) {
		const clinician = await this.clinicianRepo.findOne({
			where: { id },
			relations: [
				'clinicianSpecialties',
				'clinicianSpecialties.specialty',
				'stateLicenses',
			],
		});
		if (!clinician) {
			throw new NotFoundException(`Clinician with id ${id} not found`);
		}
		return clinician;
	}

	async getAvailableSlots(clinicianId: string, from?: string, to?: string) {
		// Verify clinician exists
		const clinician = await this.clinicianRepo.findOne({
			where: { id: clinicianId },
		});
		if (!clinician) {
			throw new NotFoundException(`Clinician with id ${clinicianId} not found`);
		}

		const qb = this.availabilitySlotRepo
			.createQueryBuilder('slot')
			.where('slot.clinicianId = :clinicianId', { clinicianId })
			.andWhere('slot.isBooked = :isBooked', { isBooked: false })
			.orderBy('slot.startTime', 'ASC');

		if (from) {
			qb.andWhere('slot.startTime >= :from', { from });
		}
		if (to) {
			qb.andWhere('slot.startTime <= :to', { to });
		}

		return qb.getMany();
	}

	async listPatients() {
		return this.patientRepo.find({
			where: { isActive: true },
			order: { lastName: 'ASC', firstName: 'ASC' },
		});
	}

	async listClinicians() {
		return this.clinicianRepo.find({
			where: { isActive: true },
			relations: [
				'clinicianSpecialties',
				'clinicianSpecialties.specialty',
				'stateLicenses',
			],
			order: { lastName: 'ASC', firstName: 'ASC' },
		});
	}
}
