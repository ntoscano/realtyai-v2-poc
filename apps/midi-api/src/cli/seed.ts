import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import { DataSource } from 'typeorm';
import { getTypeOrmConfig } from '../config/typeorm';
import { Specialty } from '../modules/clinician/entities/specialty.entity';
import { Clinician } from '../modules/clinician/entities/clinician.entity';
import { ClinicianSpecialty } from '../modules/clinician/entities/clinician-specialty.entity';
import { StateLicense } from '../modules/clinician/entities/state-license.entity';
import { Patient } from '../modules/patient/entities/patient.entity';
import { AvailabilitySlot } from '../modules/appointment/entities/availability-slot.entity';

async function seed() {
	const dataSource = new DataSource(getTypeOrmConfig());
	await dataSource.initialize();
	console.log('Database connected');

	const specialtyRepo = dataSource.getRepository(Specialty);
	const clinicianRepo = dataSource.getRepository(Clinician);
	const clinicianSpecialtyRepo = dataSource.getRepository(ClinicianSpecialty);
	const stateLicenseRepo = dataSource.getRepository(StateLicense);
	const patientRepo = dataSource.getRepository(Patient);
	const slotRepo = dataSource.getRepository(AvailabilitySlot);

	// --- 1. Specialties ---
	const specialtiesData = [
		{
			name: 'hrt',
			displayName: 'Hormone Replacement Therapy',
			description:
				'Bioidentical hormone therapy for menopause symptom management',
		},
		{
			name: 'weight_glp1',
			displayName: 'Weight Management & GLP-1',
			description:
				'Medical weight management including GLP-1 receptor agonist therapy',
		},
		{
			name: 'mood',
			displayName: 'Mood & Emotional Wellness',
			description:
				'Support for mood changes, anxiety, and emotional wellness during menopause',
		},
		{
			name: 'sleep',
			displayName: 'Sleep Health',
			description:
				'Sleep disorder evaluation and treatment for menopause-related insomnia',
		},
		{
			name: 'sexual_wellness',
			displayName: 'Sexual Wellness',
			description:
				'Treatment for low libido, vaginal dryness, and sexual health concerns',
		},
		{
			name: 'general_menopause',
			displayName: 'General Menopause Care',
			description:
				'Comprehensive menopause care including symptom management and health monitoring',
		},
	];

	const specialties: Record<string, Specialty> = {};
	for (const data of specialtiesData) {
		const result = await specialtyRepo
			.createQueryBuilder()
			.insert()
			.into(Specialty)
			.values(data)
			.orUpdate(['display_name', 'description'], ['name'])
			.returning('*')
			.execute();
		specialties[data.name] = result.generatedMaps[0] as Specialty;
		// generatedMaps may not have all fields — fetch by name to ensure we have id
		if (!specialties[data.name].id) {
			const found = await specialtyRepo.findOneBy({ name: data.name });
			if (found) specialties[data.name] = found;
		}
	}
	console.log(`Seeded ${Object.keys(specialties).length} specialties`);

	// --- 2. Clinicians ---
	const cliniciansData = [
		{
			firstName: 'Sarah',
			lastName: 'Chen',
			credential: 'NP' as const,
			bio: "Board-certified nurse practitioner specializing in hormone replacement therapy and weight management. 12 years of experience in women's health.",
			yearsExperience: 12,
			rating: 4.9,
			specialties: ['hrt', 'weight_glp1'],
			states: ['CA', 'NY', 'TX'],
		},
		{
			firstName: 'Maria',
			lastName: 'Lopez',
			credential: 'MD' as const,
			bio: 'Physician with expertise in hormone therapy, mood management, and sleep health. 20 years of clinical experience.',
			yearsExperience: 20,
			rating: 4.8,
			specialties: ['hrt', 'mood', 'sleep'],
			states: ['CA', 'FL'],
		},
		{
			firstName: 'Emily',
			lastName: 'Park',
			credential: 'CNM' as const,
			bio: 'Certified nurse-midwife focused on general menopause care and hormone therapy with a holistic approach.',
			yearsExperience: 8,
			rating: 4.7,
			specialties: ['general_menopause', 'hrt'],
			states: ['NY', 'TX', 'IL'],
		},
		{
			firstName: 'Jessica',
			lastName: 'Rivera',
			credential: 'NP' as const,
			bio: 'Nurse practitioner specializing in weight management, mood support, and sexual wellness.',
			yearsExperience: 6,
			rating: 4.6,
			specialties: ['weight_glp1', 'mood', 'sexual_wellness'],
			states: ['CA', 'NY'],
		},
		{
			firstName: 'Amanda',
			lastName: 'Foster',
			credential: 'ND' as const,
			bio: 'Naturopathic doctor with expertise in sleep health and general menopause care using integrative medicine.',
			yearsExperience: 15,
			rating: 4.5,
			specialties: ['sleep', 'general_menopause'],
			states: ['TX', 'FL', 'IL'],
		},
	];

	const clinicians: Record<string, Clinician> = {};
	for (const data of cliniciansData) {
		// Upsert by firstName+lastName combo (entity has no email field)
		let clinician = await clinicianRepo.findOneBy({
			firstName: data.firstName,
			lastName: data.lastName,
		});
		if (!clinician) {
			clinician = clinicianRepo.create({
				firstName: data.firstName,
				lastName: data.lastName,
				credential: data.credential,
				bio: data.bio,
				yearsExperience: data.yearsExperience,
				rating: data.rating,
			});
			clinician = await clinicianRepo.save(clinician);
		} else {
			clinician.credential = data.credential;
			clinician.bio = data.bio;
			clinician.yearsExperience = data.yearsExperience;
			clinician.rating = data.rating;
			clinician = await clinicianRepo.save(clinician);
		}
		clinicians[`${data.firstName}_${data.lastName}`] = clinician;

		// --- 3. Clinician-Specialty associations ---
		for (let i = 0; i < data.specialties.length; i++) {
			const specName = data.specialties[i];
			const specialty = specialties[specName];
			const existing = await clinicianSpecialtyRepo.findOneBy({
				clinicianId: clinician.id,
				specialtyId: specialty.id,
			});
			if (!existing) {
				const cs = clinicianSpecialtyRepo.create({
					clinicianId: clinician.id,
					specialtyId: specialty.id,
					isPrimary: i === 0,
				});
				await clinicianSpecialtyRepo.save(cs);
			} else {
				existing.isPrimary = i === 0;
				await clinicianSpecialtyRepo.save(existing);
			}
		}

		// --- 4. State Licenses ---
		for (const state of data.states) {
			const existing = await stateLicenseRepo.findOneBy({
				clinicianId: clinician.id,
				state,
			});
			if (!existing) {
				const license = stateLicenseRepo.create({
					clinicianId: clinician.id,
					state,
					licenseNumber: `LIC-${state}-${data.lastName.toUpperCase()}-${Math.floor(
						10000 + Math.random() * 90000,
					)}`,
					licenseType:
						data.credential === 'MD'
							? 'Medical License'
							: data.credential === 'NP'
							? 'APRN License'
							: data.credential === 'CNM'
							? 'CNM License'
							: 'ND License',
					issuedDate: '2023-01-01',
					expirationDate: '2027-12-31',
					isVerified: true,
					verifiedAt: new Date(),
				});
				await stateLicenseRepo.save(license);
			}
		}
	}
	console.log(
		`Seeded ${
			Object.keys(clinicians).length
		} clinicians with specialties and licenses`,
	);

	// --- 5. Patients ---
	const patientsData = [
		{
			firstName: 'Lisa',
			lastName: 'Thompson',
			email: 'lisa.thompson@example.com',
			dateOfBirth: '1975-06-15',
			state: 'CA',
		},
		{
			firstName: 'Karen',
			lastName: 'Davis',
			email: 'karen.davis@example.com',
			dateOfBirth: '1970-03-22',
			state: 'NY',
		},
		{
			firstName: 'Michelle',
			lastName: 'Wilson',
			email: 'michelle.wilson@example.com',
			dateOfBirth: '1978-11-08',
			state: 'TX',
		},
		{
			firstName: 'Jennifer',
			lastName: 'Moore',
			email: 'jennifer.moore@example.com',
			dateOfBirth: '1972-09-30',
			state: 'FL',
		},
	];

	for (const data of patientsData) {
		let patient = await patientRepo.findOneBy({ email: data.email });
		if (!patient) {
			patient = patientRepo.create(data);
			await patientRepo.save(patient);
		} else {
			patient.firstName = data.firstName;
			patient.lastName = data.lastName;
			patient.dateOfBirth = data.dateOfBirth;
			patient.state = data.state;
			await patientRepo.save(patient);
		}
	}
	console.log(`Seeded ${patientsData.length} patients`);

	// --- 6. Availability Slots ---
	// 8 slots per clinician over the next 7 days
	const slotTimes = [
		{ hour: 9, minute: 0 },
		{ hour: 9, minute: 30 },
		{ hour: 10, minute: 0 },
		{ hour: 10, minute: 30 },
		{ hour: 11, minute: 0 },
		{ hour: 11, minute: 30 },
		{ hour: 12, minute: 0 },
		{ hour: 12, minute: 30 },
	];

	let slotCount = 0;
	const tomorrow = new Date();
	tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
	tomorrow.setUTCHours(0, 0, 0, 0);

	for (const clinician of Object.values(clinicians)) {
		// Distribute 8 slots across 7 days: one slot per day for the first day,
		// then distribute remaining across the week
		let slotIndex = 0;
		for (
			let dayOffset = 0;
			dayOffset < 7 && slotIndex < slotTimes.length;
			dayOffset++
		) {
			const day = new Date(tomorrow);
			day.setUTCDate(day.getUTCDate() + dayOffset);

			// Assign 1-2 slots per day to distribute 8 across 7 days
			const slotsForDay = dayOffset < 1 ? 2 : 1;
			for (let s = 0; s < slotsForDay && slotIndex < slotTimes.length; s++) {
				const time = slotTimes[slotIndex];
				const startTime = new Date(day);
				startTime.setUTCHours(time.hour, time.minute, 0, 0);

				const endTime = new Date(startTime);
				endTime.setUTCMinutes(endTime.getUTCMinutes() + 30);

				// Upsert by unique constraint (clinicianId, startTime)
				const existing = await slotRepo.findOneBy({
					clinicianId: clinician.id,
					startTime,
				});
				if (!existing) {
					const slot = slotRepo.create({
						clinicianId: clinician.id,
						startTime,
						endTime,
						isBooked: false,
					});
					await slotRepo.save(slot);
					slotCount++;
				}
				slotIndex++;
			}
		}
	}
	console.log(`Seeded ${slotCount} availability slots`);

	await dataSource.destroy();
	console.log('Seed complete!');
}

seed().catch((err) => {
	console.error('Seed failed:', err);
	process.exit(1);
});
