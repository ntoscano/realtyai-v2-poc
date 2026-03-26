# PRD: Clinician Matching & Appointment Scheduling

## Introduction

Build a fullstack POC of The Telehealth Platform's clinician matching and appointment scheduling system as an interview prep exercise within the existing Turborepo monorepo. Patients submit a health questionnaire describing symptoms and care goals; the system maps symptoms to specialties and matches patients to qualified clinicians based on specialty alignment, state licensure, and availability; patients book an appointment slot with concurrency-safe booking via pessimistic locking (`SELECT...FOR UPDATE`); both patients and clinicians see appointment status.

Two new apps:

- **`apps/telehealth-api`** — NestJS backend (port 3004)
- **`apps/telehealth-ui`** — Next.js 14 frontend (port 2027)

See `docs/the-telehealth-platform/tech-challenge.md` Challenge 2 for architecture rationale and evaluation criteria.

## Goals

- Demonstrate a clean fullstack implementation of symptom-based clinician matching with concurrent-safe appointment booking
- Implement all 9 deliverables from the tech challenge: system diagram, data model, API design, matching algorithm, concurrency strategy, multi-state licensure, EHR integration hooks, scalability notes, trade-offs
- Follow all existing monorepo patterns (TypeORM entities, NestJS modules, Next.js App Router, Tailwind/shadcn)
- Keep scope focused: no auth, no actual EHR integration, no notifications, no real AI

## User Stories

### US-001: Backend scaffolding

**Description:** As a developer, I need the NestJS backend app scaffolded with PostgreSQL connectivity so that clinician and appointment data can be persisted and queried via REST.

**Acceptance Criteria:**

- [ ] `apps/telehealth-api` created with `package.json` following `apps/tictactoe-api/package.json` patterns (NestJS 10, TypeORM, pg, class-validator, class-transformer)
- [ ] `tsconfig.json` follows `apps/tictactoe-api/tsconfig.json` (identical)
- [ ] `nest-cli.json` follows `apps/tictactoe-api/nest-cli.json` (identical)
- [ ] `docker-compose.yml` runs `postgres:16` on port 54324 with database `telehealth_matching`
- [ ] `.env.example` configured with `PORT=3004`, `POSTGRES_PORT=54324`, `POSTGRES_DB=telehealth_matching`
- [ ] Config files created: `src/config/postgres.ts`, `src/config/typeorm.ts`, `src/config/entities.ts` (mirror existing patterns, defaults to port 54324, db `telehealth_matching`, SnakeNamingStrategy)
- [ ] `src/main.ts` bootstraps NestJS on port 3004 with CORS enabled and global ValidationPipe
- [ ] `src/app.module.ts` wires `TypeORM.forRoot` + `QuestionnaireModule` + `ClinicianModule` + `AppointmentModule`
- [ ] `pnpm install` succeeds from monorepo root
- [ ] `docker:up` script starts PostgreSQL container successfully
- [ ] Typecheck passes

### US-002: Database entities

**Description:** As a developer, I need the 8 TypeORM entities (Patient, Clinician, Specialty, ClinicianSpecialty, StateLicense, AvailabilitySlot, Appointment, HealthQuestionnaire) so that the data model supports the full matching and scheduling lifecycle.

**Acceptance Criteria:**

- [ ] `src/modules/patient/entities/patient.entity.ts` created with: `id` (UUID PK), `firstName` (varchar 255), `lastName` (varchar 255), `email` (varchar 255, unique), `dateOfBirth` (date), `state` (varchar 2 — patient's state of residence for licensure matching), `isActive` (boolean, default true), `createdAt`, `updatedAt`
- [ ] `src/modules/clinician/entities/clinician.entity.ts` created with: `id` (UUID PK), `firstName` (varchar 255), `lastName` (varchar 255), `credential` (varchar 20: NP/CNM/MD/ND), `bio` (text, nullable), `yearsExperience` (integer, nullable), `rating` (decimal 3,2, nullable), `maxPatientsPerDay` (integer, default 8), `isAcceptingPatients` (boolean, default true), `isActive` (boolean, default true), `createdAt`, `updatedAt`. `OneToMany` to StateLicense, AvailabilitySlot, Appointment
- [ ] `src/modules/clinician/entities/specialty.entity.ts` created with: `id` (UUID PK), `name` (varchar 100, unique — 'hrt', 'weight_glp1', 'mood', 'sleep', 'sexual_wellness', 'general_menopause'), `displayName` (varchar 255), `description` (text, nullable), `createdAt`
- [ ] `src/modules/clinician/entities/clinician-specialty.entity.ts` created with: `clinicianId` (UUID FK, composite PK), `specialtyId` (UUID FK, composite PK), `isPrimary` (boolean, default false). `ManyToOne` to Clinician and Specialty. Index on `specialtyId`
- [ ] `src/modules/clinician/entities/state-license.entity.ts` created with: `id` (UUID PK), `clinicianId` (UUID FK), `state` (varchar 2), `licenseNumber` (varchar 100), `licenseType` (varchar 50), `issuedDate` (date), `expirationDate` (date), `isVerified` (boolean, default false), `verifiedAt` (timestamptz, nullable), `createdAt`, `updatedAt`. Unique constraint on `(clinicianId, state)`. Index on `(state, expirationDate)`
- [ ] `src/modules/appointment/entities/availability-slot.entity.ts` created with: `id` (UUID PK), `clinicianId` (UUID FK), `startTime` (timestamptz), `endTime` (timestamptz), `isBooked` (boolean, default false), `createdAt`, `updatedAt`. Unique constraint on `(clinicianId, startTime)`. Index on `(clinicianId, startTime, isBooked)`. Index on `(startTime, isBooked)`. Check: `endTime > startTime`
- [ ] `src/modules/appointment/entities/appointment.entity.ts` created with: `id` (UUID PK), `patientId` (UUID FK), `clinicianId` (UUID FK), `slotId` (UUID FK, unique — one appointment per slot), `status` (varchar 20, default 'scheduled': scheduled/completed/cancelled/no_show), `visitType` (varchar 50, default 'initial_consultation': initial_consultation/follow_up/urgent), `questionnaireId` (UUID FK, nullable), `notes` (text, nullable), `cancelledAt` (timestamptz, nullable), `cancelledBy` (varchar 20, nullable: patient/clinician/system), `createdAt`, `updatedAt`. Index on `(patientId, status)`. Index on `(clinicianId, status)`
- [ ] `src/modules/questionnaire/entities/health-questionnaire.entity.ts` created with: `id` (UUID PK), `patientId` (UUID FK), `symptoms` (text array — 'hot_flashes', 'weight_gain', 'mood_changes', 'sleep_issues', 'low_libido', 'brain_fog', 'hair_thinning'), `severity` (varchar 20: mild/moderate/severe), `careGoals` (text array — 'hormone_therapy', 'weight_management', 'mood_support', 'sleep_improvement'), `currentMedications` (text array, nullable), `hasPriorHrt` (boolean, default false), `menopauseStage` (varchar 30, nullable: perimenopause/menopause/post_menopause), `additionalNotes` (text, nullable), `createdAt`, `updatedAt`. Index on `(patientId, createdAt DESC)`
- [ ] `src/config/entities.ts` exports all 8 entities
- [ ] TypeORM `synchronize: true` auto-creates tables on startup
- [ ] Typecheck passes

### US-003: Questionnaire submission and specialty mapping

**Description:** As a patient, I need to submit a health questionnaire so that the system can map my symptoms and care goals to relevant specialties for clinician matching.

**Acceptance Criteria:**

- [ ] `src/modules/questionnaire/dto/create-questionnaire.dto.ts` validates: `patientId` (UUID), `symptoms` (array of strings, IsIn for valid symptom values), `severity` (IsIn mild/moderate/severe), `careGoals` (array of strings, IsIn for valid goal values), `menopauseStage` (optional, IsIn perimenopause/menopause/post_menopause), `currentMedications` (optional array), `hasPriorHrt` (optional boolean), `additionalNotes` (optional string)
- [ ] `src/modules/questionnaire/questionnaire.controller.ts` with `@Controller('api/questionnaires')` exposes:
  - `POST /api/questionnaires` — accepts CreateQuestionnaireDto, returns 201 with questionnaire + `matchedSpecialties` array
- [ ] `src/modules/questionnaire/questionnaire.service.ts` implements:
  - `create(dto)` — validates patient exists, stores questionnaire, computes `matchedSpecialties` using symptom-to-specialty mapping
  - Symptom/goal mapping: `hot_flashes`/`hormone_therapy` → `hrt`, `weight_gain`/`weight_management` → `weight_glp1`, `mood_changes`/`mood_support` → `mood`, `sleep_issues`/`sleep_improvement` → `sleep`, `low_libido` → `sexual_wellness`, unmapped → `general_menopause`
  - `findOne(id)` — returns questionnaire with matched specialties
- [ ] `src/modules/questionnaire/questionnaire.module.ts` with `TypeOrmModule.forFeature([HealthQuestionnaire, Patient, Specialty])`
- [ ] Invalid inputs return 400 with descriptive error messages
- [ ] Typecheck passes

### US-004: Clinician matching endpoint

**Description:** As a patient, I need an endpoint that returns clinicians matched to my questionnaire so that I can choose a provider based on specialty fit, availability, and ratings.

**Acceptance Criteria:**

- [ ] `src/modules/clinician/clinician.controller.ts` with `@Controller('api/clinicians')` exposes:
  - `GET /api/clinicians/match?patient_id=X&questionnaire_id=Y` — returns ranked list of matched clinicians
  - `GET /api/clinicians/:id` — returns clinician detail with specialties, bio, licenses
  - `GET /api/clinicians/:id/slots?from=DATE&to=DATE` — returns available (unbooked) time slots for a clinician within date range
  - `GET /api/patients` — returns all active patients (for seed data selection in UI)
- [ ] `src/modules/clinician/clinician.service.ts` implements:
  - `matchClinicians(patientId, questionnaireId)`:
    1. Load patient → get state
    2. Load questionnaire → map symptoms/goals to specialty names
    3. Filter clinicians: `isActive = true`, `isAcceptingPatients = true`, has verified non-expired license in patient's state, has at least one matching specialty
    4. Rank by weighted score: `0.5 * (matching_specialties / needed_specialties) + 0.2 * (available_slots / max_available) + 0.2 * (rating / 5.0) + 0.1 * min(years_experience / 20, 1.0)`
    5. Return top 10 ordered by match_score DESC, including: clinician info, specialties, matching_specialties, match_score, available_slot_count, next_available
  - `findOne(id)` — clinician with specialties and licenses
  - `getAvailableSlots(clinicianId, from?, to?)` — unbooked slots within date range
  - `listPatients()` — all active patients
- [ ] `src/modules/clinician/clinician.module.ts` with `TypeOrmModule.forFeature([Clinician, Specialty, ClinicianSpecialty, StateLicense, AvailabilitySlot, Patient, HealthQuestionnaire])`
- [ ] Clinician not licensed in patient's state → excluded from results (not an error, just filtered out)
- [ ] Typecheck passes

### US-005: Appointment booking with concurrency protection

**Description:** As a patient, I need a booking endpoint that safely handles concurrent attempts so that only one patient can book a given time slot.

**Acceptance Criteria:**

- [ ] `src/modules/appointment/dto/book-appointment.dto.ts` validates: `patientId` (UUID), `clinicianId` (UUID), `slotId` (UUID), `questionnaireId` (optional UUID), `visitType` (optional, IsIn initial_consultation/follow_up/urgent, default 'initial_consultation')
- [ ] `src/modules/appointment/appointment.controller.ts` with `@Controller('api/appointments')` exposes:
  - `POST /api/appointments` — accepts BookAppointmentDto, returns 201 with appointment details including clinician name, start/end time, status
- [ ] `src/modules/appointment/appointment.service.ts` implements `book(dto)`:
  - Uses `QueryRunner` with `startTransaction()` for atomic booking
  - Acquires `pessimistic_write` lock on availability slot row via `createQueryBuilder().setLock('pessimistic_write')`
  - Validates slot exists (404 if not), slot `isBooked` is false (409 "This time slot is no longer available" if already booked)
  - Validates clinician has verified, non-expired license in patient's state (400 "Clinician is not licensed to practice in {state}" if not)
  - Creates Appointment record, updates slot `isBooked = true`, commits transaction
  - Rolls back transaction on any error, releases QueryRunner in finally block
- [ ] `src/modules/appointment/appointment.module.ts` with `TypeOrmModule.forFeature([Appointment, AvailabilitySlot, Clinician, Patient, StateLicense])`
- [ ] Concurrent booking attempts: first succeeds, second gets 409
- [ ] Typecheck passes

### US-006: Appointment listing and status management

**Description:** As a patient or clinician, I need endpoints to view and manage appointments so I can track my schedule and update appointment status.

**Acceptance Criteria:**

- [ ] Extends `appointment.controller.ts` with:
  - `GET /api/appointments?patient_id=X` — returns appointments for a patient with clinician name, slot times, status, ordered by start_time DESC
  - `GET /api/appointments?clinician_id=X` — returns appointments for a clinician with patient name, slot times, status, ordered by start_time DESC
  - `PATCH /api/appointments/:id` — update appointment status (cancel, complete, no_show)
- [ ] `src/modules/appointment/dto/update-appointment.dto.ts` validates: `status` (IsIn cancelled/completed/no_show), `cancelledBy` (optional, IsIn patient/clinician/system — required when status is 'cancelled')
- [ ] Extends `appointment.service.ts` with:
  - `listForPatient(patientId)` — returns appointments with clinician and slot relations
  - `listForClinician(clinicianId)` — returns appointments with patient and slot relations
  - `updateStatus(id, dto)` — validates appointment exists (404 if not), validates status transition is valid (cannot cancel an already completed appointment), updates status. When cancelling: sets `cancelledAt`, `cancelledBy`, restores slot `isBooked = false`
- [ ] Cancelling an appointment frees the time slot (sets `isBooked` back to false)
- [ ] Typecheck passes

### US-007: Seed script

**Description:** As a developer, I need seed data so that the frontend has patients, clinicians, specialties, licenses, and availability slots to work with immediately.

**Acceptance Criteria:**

- [ ] `src/cli/seed.ts` creates:
  - 6 specialties: HRT (Hormone Replacement Therapy), Weight/GLP-1 (Weight Management & GLP-1), Mood (Mood & Emotional Wellness), Sleep (Sleep Health), Sexual Wellness, General Menopause
  - 5 clinicians with varied credentials and specialties:
    - "Dr. Sarah Chen" (NP, specialties: hrt + weight_glp1, rating: 4.9, 12 yrs exp)
    - "Dr. Maria Lopez" (MD, specialties: hrt + mood + sleep, rating: 4.8, 20 yrs exp)
    - "Dr. Emily Park" (CNM, specialties: general_menopause + hrt, rating: 4.7, 8 yrs exp)
    - "Dr. Jessica Rivera" (NP, specialties: weight_glp1 + mood + sexual_wellness, rating: 4.6, 6 yrs exp)
    - "Dr. Amanda Foster" (ND, specialties: sleep + general_menopause, rating: 4.5, 15 yrs exp)
  - State licenses (multi-state): Chen (CA, NY, TX), Lopez (CA, FL), Park (NY, TX, IL), Rivera (CA, NY), Foster (TX, FL, IL) — all verified, expiring 2027
  - 4 patients: "Lisa Thompson" (CA), "Karen Davis" (NY), "Michelle Wilson" (TX), "Jennifer Moore" (FL)
  - Availability slots: 8 slots per clinician over the next 7 days (30-min increments, 9am-1pm local, all unbooked)
- [ ] Uses upsert pattern to avoid duplicates on re-run
- [ ] `pnpm seed` script added to `package.json`
- [ ] Typecheck passes

### US-008: Backend verification

**Description:** As a developer, I need to verify the full backend works end-to-end before building the frontend.

**Acceptance Criteria:**

- [ ] `cd apps/telehealth-api && pnpm docker:up` — PostgreSQL starts on port 54324
- [ ] `pnpm dev` — backend starts on port 3004, tables auto-created via `synchronize: true`
- [ ] `pnpm seed` — specialties, clinicians, licenses, patients, slots inserted
- [ ] `curl GET /api/patients` — returns 4 patients
- [ ] `curl GET /api/clinicians/match?patient_id=LISA_ID&questionnaire_id=Q_ID` — returns ranked clinicians licensed in CA with matching specialties
- [ ] `curl GET /api/clinicians/:id/slots` — returns unbooked time slots
- [ ] `curl POST /api/questionnaires` with valid symptoms — returns 201 with matched specialties
- [ ] `curl POST /api/appointments` with valid slot — returns 201, status = scheduled
- [ ] Same curl again — returns 409, "This time slot is no longer available"
- [ ] `curl POST /api/appointments` with unlicensed clinician/patient state combo — returns 400 with licensure error
- [ ] `curl PATCH /api/appointments/:id` with `status: cancelled` — returns 200, slot freed
- [ ] Invalid POST requests — returns 400 with descriptive validation errors

### US-009: Frontend scaffolding

**Description:** As a developer, I need the Next.js frontend app scaffolded with Tailwind, shadcn/ui components, types, and API client so I can build the patient and clinician pages.

**Acceptance Criteria:**

- [ ] `apps/telehealth-ui` created with `package.json` following `apps/tictactoe/package.json` patterns (Next.js 14, React 18, Tailwind)
- [ ] `tsconfig.json` extends shared config with `@/*` alias
- [ ] `next.config.js`, `postcss.config.js`, `tailwind.config.ts` copied/adapted from `apps/tictactoe/`
- [ ] `.env.example` with `NEXT_PUBLIC_API_URL=http://localhost:3004`
- [ ] `src/app/globals.css` with Tailwind base + shadcn theme variables
- [ ] `src/lib/utils.ts` with `cn()` utility
- [ ] shadcn/ui components copied: button, card, badge, select, input, textarea, label (from `apps/tictactoe/` or `apps/shift-ui/`)
- [ ] `src/types/index.ts` defines interfaces: `Patient`, `Clinician`, `Specialty`, `StateLicense`, `AvailabilitySlot`, `Appointment`, `HealthQuestionnaire`, `MatchedClinician`, plus enums/types for symptoms, care goals, severity, menopause stage, visit type, appointment status
- [ ] `src/lib/api/telehealthApi.ts` implements fetch wrapper with functions: `listPatients()`, `submitQuestionnaire()`, `matchClinicians()`, `getClinicianSlots()`, `bookAppointment()`, `listAppointments()`, `cancelAppointment()`
- [ ] `src/app/layout.tsx` with nav bar linking to Patient Portal (`/`) and Clinician Dashboard (`/clinician`)
- [ ] Landing page (`/`) shows a brief welcome message and link to start questionnaire
- [ ] `pnpm install` succeeds and `pnpm dev` starts on port 2027
- [ ] Typecheck passes

### US-010: Patient questionnaire and matching page

**Description:** As a patient, I need a page where I select my profile, fill out a health questionnaire, and see matched clinicians so I can choose a provider that fits my needs.

**Acceptance Criteria:**

- [ ] `src/app/questionnaire/page.tsx` as a `'use client'` component
- [ ] Dropdown to select a patient (populated from `GET /api/patients`)
- [ ] Questionnaire form with:
  - Symptom checkboxes (hot flashes, weight gain, mood changes, sleep issues, low libido, brain fog, hair thinning) — at least one required
  - Severity radio buttons (mild, moderate, severe)
  - Care goals checkboxes (hormone therapy, weight management, mood support, sleep improvement) — at least one required
  - Menopause stage dropdown (perimenopause, menopause, post-menopause)
  - Optional additional notes textarea
- [ ] Submit calls `POST /api/questionnaires`, then automatically calls `GET /api/clinicians/match` with the returned questionnaire ID
- [ ] Matched clinicians displayed as cards showing: name, credential, specialties (with matching ones highlighted), match score (as percentage), rating, years experience, available slot count, next available date
- [ ] Cards ordered by match score descending
- [ ] Each card has a "View Available Times" button that navigates to booking page
- [ ] Loading and error states handled
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-011: Appointment booking page

**Description:** As a patient, I need a page where I see a clinician's available time slots and book an appointment so I can schedule my visit.

**Acceptance Criteria:**

- [ ] `src/app/book/[clinicianId]/page.tsx` as a `'use client'` component
- [ ] Displays clinician info at top: name, credential, specialties, bio, rating
- [ ] Shows available time slots from `GET /api/clinicians/:id/slots` grouped by date
- [ ] Each slot shows start time and end time, formatted in local timezone
- [ ] Clicking a slot calls `POST /api/appointments` with the patient ID (from query param or session state), clinician ID, and slot ID
- [ ] On success: shows confirmation with appointment details (clinician name, date, time, status "scheduled"), link to "My Appointments"
- [ ] On 409 error: shows "This time slot is no longer available" inline, refreshes slot list
- [ ] On 400 licensure error: shows error message inline
- [ ] Loading and error states handled
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-012: Clinician dashboard

**Description:** As a clinician, I need a dashboard showing my upcoming appointments and schedule so I can manage my patient visits.

**Acceptance Criteria:**

- [ ] `src/app/clinician/page.tsx` as a `'use client'` component
- [ ] Dropdown to select a clinician (populated from a new `GET /api/clinicians` endpoint that returns all active clinicians — add to clinician controller)
- [ ] Profile section: shows selected clinician's name, credential, specialties, licensed states, rating
- [ ] Upcoming appointments section: shows appointments for the selected clinician from `GET /api/appointments?clinician_id=X`
  - Each appointment shows: patient name, date/time, visit type, status badge (scheduled = blue, completed = green, cancelled = gray, no_show = red)
  - "Cancel" button on scheduled appointments → calls `PATCH /api/appointments/:id` with `status: cancelled, cancelledBy: clinician`
  - "Complete" button on scheduled appointments → calls `PATCH /api/appointments/:id` with `status: completed`
- [ ] Availability section: shows this clinician's upcoming slots with booked/available status
- [ ] Loading and error states handled
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-013: End-to-end verification

**Description:** As a developer, I need to verify the full flow works across patient questionnaire, matching, booking, and clinician dashboard.

**Acceptance Criteria:**

- [ ] Patient portal: select Lisa Thompson (CA), fill questionnaire with hot_flashes + weight_gain symptoms, hormone_therapy + weight_management goals, severity moderate
- [ ] Matched clinicians appear — Dr. Sarah Chen (NP, CA-licensed, hrt + weight_glp1 specialties) should rank highest
- [ ] Click "View Available Times" for Dr. Chen, see available slots
- [ ] Book a slot — confirmation shown with "scheduled" status
- [ ] Clinician dashboard: select Dr. Chen, see Lisa Thompson's appointment in upcoming list
- [ ] Patient portal: select Jennifer Moore (FL) — Dr. Chen does NOT appear (not licensed in FL), Dr. Maria Lopez (CA, FL) and Dr. Amanda Foster (TX, FL, IL) DO appear
- [ ] Book an appointment for Jennifer Moore with Dr. Lopez
- [ ] Return to Dr. Chen's slots — the booked slot is no longer available
- [ ] Clinician dashboard: Dr. Lopez shows Jennifer Moore's appointment
- [ ] Cancel Jennifer Moore's appointment from clinician dashboard → slot freed, status shows "cancelled"
- [ ] Both portals reflect correct state for all appointments

## Functional Requirements

- FR-1: A patient can submit a health questionnaire with symptoms (at least one), severity level, care goals (at least one), and optional menopause stage.
- FR-2: The system maps symptoms and care goals to specialties using a deterministic mapping (hot_flashes → hrt, weight_gain → weight_glp1, etc.).
- FR-3: The matching endpoint filters clinicians by: active status, accepting patients, verified non-expired state license in the patient's state, at least one matching specialty.
- FR-4: Matched clinicians are ranked by a weighted score: 50% specialty overlap, 20% availability, 20% rating, 10% experience.
- FR-5: A patient can book an available time slot. The booking creates an Appointment record and sets the slot's `isBooked` to true.
- FR-6: After booking, the slot is no longer bookable. Concurrent booking attempts return 409 with "This time slot is no longer available".
- FR-7: Booking with an unlicensed clinician/patient state combination returns 400 with a descriptive licensure error.
- FR-8: Appointments can be cancelled, which frees the time slot (sets `isBooked` back to false).
- FR-9: All API inputs are validated — missing fields, invalid types, and constraint violations return 400 with clear messages.
- FR-10: Clinicians appear only for patients in states where they hold a verified, non-expired license.

## Non-Goals

- No authentication or JWT — patient/clinician selection via dropdown simulates user context
- No WebSocket or real-time updates — pages refresh on action
- No actual EHR integration with AthenaOne — architecture notes hook points (`afterBooking()`) where it would plug in
- No notification system (email, SMS) — booking confirmation shown in UI only
- No AI/ML-based matching — deterministic weighted scoring algorithm
- No calendar integration — pre-defined availability slots only
- No unit or integration tests — manual verification only
- No Docker Compose for frontend — only backend uses Docker for PostgreSQL
- No time overlap validation — a patient can book overlapping appointments
- No mobile-responsive design — desktop-first is fine
- No prescription or care plan management — out of scope

## Technical Considerations

- **Monorepo Integration:** Both apps must be valid Turborepo workspace members. `pnpm install` from root must resolve all dependencies.
- **Existing Patterns to Reuse:**
  - `apps/shift-api/package.json` — NestJS 10 dependency versions
  - `apps/shift-api/src/config/` — postgres.ts, typeorm.ts patterns (SnakeNamingStrategy, `synchronize: true`)
  - `apps/shift-api/docker-compose.yml` — PostgreSQL container setup
  - `apps/shift-api/src/main.ts` — NestJS bootstrap with CORS and ValidationPipe
  - `apps/shift-ui/package.json` — Next.js 14 dependency versions
  - `apps/shift-ui/src/components/ui/` — shadcn/ui component library
  - `apps/shift-ui/src/lib/api/shiftApi.ts` — fetch wrapper pattern
- **Docker:** Separate container on port 54324 to avoid conflicts with existing postgres on 54322 (tictactoe) and 54323 (shift).
- **TypeORM:** Uses `synchronize: true` for POC — no migrations needed. SnakeNamingStrategy maps camelCase properties to snake_case columns.
- **Concurrency:** Pessimistic locking via `SELECT...FOR UPDATE` on AvailabilitySlot using TypeORM QueryRunner. Lock held for milliseconds — acceptable at POC contention levels.
- **Multi-State Licensure:** StateLicense is a separate entity with expiration dates and verification status — NOT a string array on the clinician. This enables proper expiration filtering and verified-only matching at query time.
- **Matching Algorithm:** Deterministic weighted scoring, not ML. Explainable and debuggable. The symptom-to-specialty mapping is hardcoded — in production this would come from a configuration table.
- **Time Handling:** All times stored as TIMESTAMPTZ (UTC). Frontend converts to local time for display. Clinician availability slots seeded in UTC.

## Success Metrics

- All 9 deliverables from the tech challenge are demonstrable in the running POC
- Both apps start without errors via `pnpm dev`
- Matching correctly filters by state licensure and specialty, and ranks by weighted score
- Concurrent booking attempts are handled safely (first succeeds, second gets 409)
- Cancellation correctly frees slots for rebooking
- The codebase follows existing monorepo patterns and is clean enough for interview discussion

## Open Questions

- None — scope has been intentionally constrained to match the architecture challenge deliverables
