# PRD: Healthcare Shift Marketplace

## Introduction

Build a fullstack POC of a two-sided healthcare shift marketplace as an interview prep exercise within the existing Turborepo monorepo. Facilities post shifts with required qualifications and pay rates; professionals browse available shifts filtered by their qualification and book them; both sides see updated status. Concurrent booking attempts are handled safely via pessimistic locking (`SELECT...FOR UPDATE`).

Two new apps:

- **`apps/shift-ui`** — Next.js 14 frontend (port 2026)
- **`apps/shift-api`** — NestJS backend (port 3003)

See `docs/the-staffing-platform/tech-challenge.md` for architecture rationale and evaluation criteria.
See `docs/the-staffing-platform/implementation-plan.md` for detailed file lists and code patterns.

## Goals

- Demonstrate a clean fullstack implementation of a two-sided marketplace with concurrent-safe booking
- Implement all 8 acceptance criteria from the tech challenge end-to-end
- Follow all existing monorepo patterns (TypeORM entities, NestJS modules, Next.js App Router, Tailwind/shadcn)
- Keep the scope focused: no auth, no extra credit items, no AI integration

## User Stories

### US-001: Backend scaffolding

**Description:** As a developer, I need the NestJS backend app scaffolded with PostgreSQL connectivity so that shift data can be persisted and queried via REST.

**Acceptance Criteria:**

- [ ] `apps/shift-api` created with `package.json` following `apps/tictactoe-api/package.json` patterns (NestJS 10, TypeORM, pg, class-validator, class-transformer; no langchain, redis, socket.io, postgraphile deps)
- [ ] `tsconfig.json` follows `apps/tictactoe-api/tsconfig.json` (identical)
- [ ] `nest-cli.json` follows `apps/tictactoe-api/nest-cli.json` (identical)
- [ ] `docker-compose.yml` runs `postgres:16` on port 54323 with database `shift_marketplace` (no Redis)
- [ ] `.env.example` configured with `PORT=3003`, `POSTGRES_PORT=54323`, `POSTGRES_DB=shift_marketplace`
- [ ] Config files created: `src/config/postgres.ts`, `src/config/typeorm.ts`, `src/config/entities.ts` (mirror existing patterns, defaults to port 54323, db `shift_marketplace`, SnakeNamingStrategy)
- [ ] `src/main.ts` bootstraps NestJS on port 3003 with CORS enabled and global ValidationPipe
- [ ] `src/app.module.ts` wires `TypeORM.forRoot` + `ShiftModule` + `BookingModule`
- [ ] `pnpm install` succeeds from monorepo root
- [ ] `docker:up` script starts PostgreSQL container successfully
- [ ] Typecheck passes

### US-002: Database entities

**Description:** As a developer, I need the 4 TypeORM entities (Facility, Professional, Shift, Booking) so that the data model supports the full shift lifecycle.

**Acceptance Criteria:**

- [ ] `src/modules/shift/entities/facility.entity.ts` created with: `id` (UUID PK), `name` (varchar 255), `type` (varchar 20: nursing_home/hospital/clinic), `isActive` (boolean, default true), `createdAt`, `updatedAt`. `OneToMany` relationship to Shift
- [ ] `src/modules/shift/entities/professional.entity.ts` created with: `id` (UUID PK), `name` (varchar 255), `qualification` (varchar 10: CNA/LPN/RN), `isActive` (boolean, default true), `createdAt`, `updatedAt`
- [ ] `src/modules/shift/entities/shift.entity.ts` created with: `id` (UUID PK), `facilityId` (UUID FK), `qualificationRequired` (varchar 10), `startTime` (timestamptz), `endTime` (timestamptz), `payRateCents` (int), `status` (varchar 20, default 'open': open/booked/completed/cancelled), `createdAt`, `updatedAt`. `ManyToOne` to Facility, `OneToOne` to Booking. Composite indexes on `[status, qualificationRequired, startTime]` and `[facilityId, startTime]`
- [ ] `src/modules/booking/entities/booking.entity.ts` created with: `id` (UUID PK), `shiftId` (UUID FK, unique), `professionalId` (UUID FK), `status` (varchar 20, default 'confirmed': confirmed/completed/cancelled), `bookedAt` (timestamptz, default NOW()), `createdAt`, `updatedAt`. `OneToOne` to Shift with `@JoinColumn`, `ManyToOne` to Professional. Index on `[professionalId, status]`
- [ ] `src/config/entities.ts` exports `[Facility, Professional, Shift, Booking]`
- [ ] TypeORM `synchronize: true` auto-creates tables on startup
- [ ] Typecheck passes

### US-003: Shift CRUD endpoints

**Description:** As a facility, I need REST endpoints to create shifts and list shifts/facilities/professionals so the frontend can display and manage shift data.

**Acceptance Criteria:**

- [ ] `src/modules/shift/dto/create-shift.dto.ts` validates: `facilityId` (UUID), `qualificationRequired` (IsIn CNA/LPN/RN), `startTime` (ISO 8601), `endTime` (ISO 8601), `payRateCents` (positive integer)
- [ ] `src/modules/shift/shift.controller.ts` with `@Controller('api')` exposes:
  - `POST /api/shifts` — accepts `CreateShiftDto`, returns 201 with shift including facility name
  - `GET /api/shifts` — query params: `status` (open/booked/all, default open), `qualification` (optional CNA/LPN/RN). Returns shifts with facility name and booking info
  - `GET /api/shifts/:id` — returns shift with facility + booking + professional details, 404 if not found
  - `GET /api/facilities` — returns all active facilities
  - `GET /api/professionals` — returns all active professionals
- [ ] `src/modules/shift/shift.service.ts` implements:
  - `create(dto)` — validates facility exists, validates endTime > startTime, saves shift, returns with facility name
  - `findAll(status?, qualification?)` — query builder with optional where clauses, joins facility, left joins booking + professional
  - `findOne(id)` — find by id with relations, throws NotFoundException if not found
  - `listFacilities()` — returns all active facilities
  - `listProfessionals()` — returns all active professionals
- [ ] `src/modules/shift/shift.module.ts` with `TypeOrmModule.forFeature([Facility, Professional, Shift])`
- [ ] Invalid inputs return 400 with descriptive error messages
- [ ] Typecheck passes

### US-004: Booking endpoint with concurrency protection

**Description:** As a professional, I need a booking endpoint that safely handles concurrent attempts so that only one professional can book a given shift.

**Acceptance Criteria:**

- [ ] `src/modules/booking/dto/book-shift.dto.ts` validates: `professionalId` (UUID)
- [ ] `src/modules/booking/booking.controller.ts` with `@Controller('api/shifts')` exposes:
  - `POST /api/shifts/:id/book` — accepts `BookShiftDto`, returns 200 with updated shift + booking
- [ ] `src/modules/booking/booking.service.ts` implements `bookShift(shiftId, dto)`:
  - Uses `QueryRunner` with `startTransaction()` for atomic booking
  - Acquires `pessimistic_write` lock on shift row via `createQueryBuilder().setLock('pessimistic_write')`
  - Validates shift exists (404 if not), shift status is 'open' (409 "Shift is already booked" if not)
  - Validates professional exists (404 if not), professional qualification matches shift requirement (400 with message `"Professional qualification 'X' does not match required 'Y'"` if not)
  - Creates Booking record, updates shift status to 'booked', commits transaction
  - Rolls back transaction on any error, releases QueryRunner in finally block
- [ ] `src/modules/booking/booking.module.ts` with `TypeOrmModule.forFeature([Booking, Shift, Professional])`
- [ ] Concurrent booking attempts: first succeeds, second gets 409
- [ ] Typecheck passes

### US-005: Seed script

**Description:** As a developer, I need seed data so that the frontend has facilities and professionals to work with immediately.

**Acceptance Criteria:**

- [ ] `src/cli/seed.ts` creates:
  - 3 facilities: "Sunrise Nursing Home" (nursing_home), "Metro General Hospital" (hospital), "Downtown Clinic" (clinic)
  - 5 professionals: "Alice Johnson" (RN), "Bob Smith" (CNA), "Carol Williams" (LPN), "David Brown" (CNA), "Eva Martinez" (LPN)
- [ ] Uses upsert pattern to avoid duplicates on re-run
- [ ] No shifts seeded — facilities create them through the UI
- [ ] `pnpm seed` script added to `package.json`
- [ ] Typecheck passes

### US-006: Backend verification

**Description:** As a developer, I need to verify the full backend works end-to-end before building the frontend.

**Acceptance Criteria:**

- [ ] `cd apps/shift-api && pnpm docker:up` — PostgreSQL starts on port 54323
- [ ] `pnpm dev` — backend starts on port 3003, tables auto-created via `synchronize: true`
- [ ] `pnpm seed` — 3 facilities + 5 professionals inserted
- [ ] `curl GET /api/facilities` — returns 3 facilities with UUIDs
- [ ] `curl GET /api/professionals` — returns 5 professionals with UUIDs
- [ ] `curl POST /api/shifts` with valid payload — returns 201 with shift including facility name
- [ ] `curl GET /api/shifts` — returns the created shift
- [ ] `curl POST /api/shifts/:id/book` with matching professional — returns 200, status = booked
- [ ] Same curl again — returns 409, "Shift is already booked"
- [ ] `curl POST /api/shifts/:id/book` with mismatched qualification — returns 400 with qualification error message
- [ ] Invalid POST requests — returns 400 with descriptive validation errors

### US-007: Frontend scaffolding

**Description:** As a developer, I need the Next.js frontend app scaffolded with Tailwind, shadcn/ui components, types, and API client so I can build the dashboard pages.

**Acceptance Criteria:**

- [ ] `apps/shift-ui` created with `package.json` following `apps/tictactoe/package.json` patterns (Next.js 14, React 18, Tailwind; no Apollo, GraphQL, Socket.io deps)
- [ ] `tsconfig.json` extends shared config with `@/*` alias
- [ ] `next.config.js`, `postcss.config.js`, `tailwind.config.ts` copied/adapted from `apps/tictactoe/`
- [ ] `.env.example` with `NEXT_PUBLIC_API_URL=http://localhost:3003`
- [ ] `src/app/globals.css` with Tailwind base + shadcn theme variables
- [ ] `src/lib/utils.ts` with `cn()` utility
- [ ] shadcn/ui components copied: button, card, badge, select (from `apps/tictactoe/`)
- [ ] `src/types/shift.ts` defines: `FacilityType`, `Qualification`, `ShiftStatus`, `Facility`, `Professional`, `BookingInfo`, `Shift` interfaces
- [ ] `src/lib/api/shiftApi.ts` implements fetch wrapper with functions: `listFacilities()`, `listProfessionals()`, `createShift()`, `listShifts()`, `getShift()`, `bookShift()`
- [ ] `src/app/layout.tsx` with nav bar linking to Facility Dashboard (`/facility`) and Professional Dashboard (`/professional`)
- [ ] `pnpm install` succeeds and `pnpm dev` starts on port 2026
- [ ] Typecheck passes

### US-008: Facility dashboard

**Description:** As a facility user, I need a dashboard where I can select a facility, post new shifts, and see all shifts posted by that facility with their current status.

**Acceptance Criteria:**

- [ ] `src/app/facility/page.tsx` as a `'use client'` component
- [ ] Dropdown to select a facility (populated from `GET /api/facilities`)
- [ ] Form to post a new shift with:
  - Qualification required dropdown (CNA, LPN, RN)
  - Date/time inputs for start and end
  - Pay rate input in dollars (converted to cents on submit)
- [ ] Submit calls `POST /api/shifts`, refetches shift list on success
- [ ] Shift list shows all shifts for the selected facility:
  - Qualification, time window, pay rate (formatted as dollars)
  - Status badge: open = green, booked = blue
  - If booked, shows professional name
- [ ] Loading and error states handled
- [ ] Typecheck passes
- [ ] Verify in browser: select facility, post shift, see it listed as "open"

### US-009: Professional dashboard

**Description:** As a professional, I need a dashboard where I can select my profile, browse available shifts matching my qualification, book shifts, and see my bookings.

**Acceptance Criteria:**

- [ ] `src/app/professional/page.tsx` as a `'use client'` component
- [ ] Dropdown to select a professional (populated from `GET /api/professionals`)
- [ ] Available shifts section: shows open shifts filtered by the selected professional's qualification
  - Each shift shows facility name, time window, pay rate
  - "Book" button on each open shift
- [ ] Book button calls `POST /api/shifts/:id/book`
  - On success: shift moves from "Available" to "My Shifts" section
  - On 409 error: shows "Shift is already booked" inline
  - On 400 error: shows qualification mismatch message inline
- [ ] "My Shifts" section: shows shifts this professional has booked
- [ ] Loading and error states handled
- [ ] Typecheck passes
- [ ] Verify in browser: select professional, see filtered shifts, book a shift, see it in "My Shifts"

### US-010: End-to-end verification

**Description:** As a developer, I need to verify the full flow works across both dashboards.

**Acceptance Criteria:**

- [ ] Facility dashboard: select facility, post a shift requiring CNA, see it listed as "open"
- [ ] Professional dashboard: select Bob Smith (CNA), see the shift in available list, click "Book"
- [ ] Professional dashboard: shift moves to "My Shifts" section
- [ ] Facility dashboard: refresh shows shift as "booked" with "Bob Smith" displayed
- [ ] Professional dashboard: select David Brown (CNA), see the same shift is no longer in available list (it's booked)
- [ ] Professional dashboard: select Alice Johnson (RN), confirm CNA shift does not appear (qualification filter works)
- [ ] Facility dashboard: post a shift requiring RN
- [ ] Professional dashboard as Alice Johnson (RN): see the RN shift, book it successfully
- [ ] Both dashboards reflect correct state for all shifts

## Functional Requirements

- FR-1: A facility can post a shift with a required qualification (CNA/LPN/RN), time window (start/end), and pay rate (stored as cents).
- FR-2: A professional sees only shifts matching their qualification when browsing available shifts.
- FR-3: A professional can book an open shift. The booking creates a Booking record and sets the shift status to "booked".
- FR-4: After booking, the shift is no longer bookable. Subsequent booking attempts return 409.
- FR-5: The facility dashboard reflects bookings — showing "booked" status and the professional's name.
- FR-6: Booking an already-booked shift returns 409 with message "Shift is already booked", displayed inline in the UI.
- FR-7: Booking with a mismatched qualification returns 400 with message describing the mismatch, displayed inline in the UI.
- FR-8: All API inputs are validated — missing fields, invalid types, and constraint violations return 400 with clear messages.

## Non-Goals

- No authentication or JWT — facility/professional selection via dropdown simulates user context
- No WebSocket or real-time updates — dashboards refresh on action
- No shift cancellation — bookings are permanent
- No time overlap validation — a professional can book overlapping shifts
- No unit or integration tests — manual verification only
- No Docker Compose for frontend — only backend uses Docker for PostgreSQL
- No PostGraphile or GraphQL — REST API only
- No AI integration — pure CRUD application
- No mobile-responsive design — desktop-first is fine

## Technical Considerations

- **Monorepo Integration:** Both apps must be valid Turborepo workspace members. `pnpm install` from root must resolve all dependencies.
- **Existing Patterns to Reuse:**
  - `apps/tictactoe-api/package.json` — NestJS 10 dependency versions
  - `apps/tictactoe-api/src/config/` — postgres.ts, typeorm.ts patterns (SnakeNamingStrategy, `synchronize: true`)
  - `apps/tictactoe-api/docker-compose.yml` — PostgreSQL container setup
  - `apps/tictactoe-api/src/main.ts` — NestJS bootstrap with CORS and ValidationPipe
  - `apps/tictactoe/package.json` — Next.js 14 dependency versions
  - `apps/tictactoe/src/components/ui/` — shadcn/ui component library
  - `apps/tictactoe/src/lib/api/gameApi.ts` — fetch wrapper pattern
- **Docker:** Separate container on port 54323 to avoid conflicts with existing tictactoe-postgres on 54322.
- **TypeORM:** Uses `synchronize: true` for POC — no migrations needed. SnakeNamingStrategy maps camelCase properties to snake_case columns.
- **Concurrency:** Pessimistic locking via `SELECT...FOR UPDATE` using TypeORM QueryRunner. Lock held for milliseconds — acceptable at POC contention levels.
- **Money:** Stored as `pay_rate_cents: INTEGER` to avoid floating-point rounding. Frontend converts dollars to cents on submit and cents to dollars for display.

## Success Metrics

- All 8 acceptance criteria from the tech challenge pass end-to-end
- Both apps start without errors via `pnpm dev`
- Concurrent booking attempts are handled safely (first succeeds, second gets 409)
- The codebase follows existing monorepo patterns and is clean enough for interview discussion
