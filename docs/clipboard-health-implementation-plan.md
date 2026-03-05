# Clipboard Health Shift Marketplace — Implementation Plan

## Context

Build a fullstack POC of a two-sided healthcare shift marketplace within the existing Turborepo monorepo. Facilities post shifts; professionals browse by qualification and book them; both sides see updated status. Two new apps: `apps/shift-api` (NestJS backend, port 3003) and `apps/shift-ui` (Next.js frontend, port 2026). Follows all existing patterns from tictactoe-api / tictactoe.

See `docs/clipboard-health-tech-challenge.md` for the architecture rationale and acceptance criteria.

## Architecture Overview

```
Facility selects facility → Posts shift (qualification, time, pay rate)
  → POST /api/shifts → Shift created (status: open)

Professional selects professional → Browses available shifts
  → GET /api/shifts?status=open&qualification=CNA
  → Filtered by professional's qualification

Professional clicks "Book"
  → POST /api/shifts/:id/book { professional_id }
  → Transaction: SELECT...FOR UPDATE on shift row
  → Validates: shift is open, qualification matches
  → Creates booking, sets shift status to "booked"
  → Returns updated shift with booking details

Both dashboards reflect the change on next fetch
```

**Key design decisions:**

- 4 entities: Facility, Professional, Shift, Booking
- Booking concurrency via `SELECT...FOR UPDATE` (QueryRunner + `pessimistic_write`)
- Money stored as cents (`pay_rate_cents: INTEGER`)
- Separate Booking entity — own lifecycle (confirmed → completed → cancelled)
- class-validator DTOs for input validation at controller layer
- Qualification enforcement server-side in BookingService (not just frontend filter)
- No auth — dropdowns simulate user context (POC scope)

---

## Phase 1: Backend — `apps/shift-api`

### Files to create

| File                     | Based on                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`           | `apps/tictactoe-api/package.json` (NestJS 10, TypeORM, pg, class-validator; remove langchain, redis, socket.io, postgraphile deps) |
| `tsconfig.json`          | `apps/tictactoe-api/tsconfig.json` (identical)                                                                                     |
| `nest-cli.json`          | `apps/tictactoe-api/nest-cli.json` (identical)                                                                                     |
| `docker-compose.yml`     | `apps/tictactoe-api/docker-compose.yml` (port 54323, db `shift_marketplace`, no Redis)                                             |
| `.env.example`           | PORT=3003, POSTGRES_PORT=54323, POSTGRES_DB=shift_marketplace                                                                      |
| `src/main.ts`            | Same pattern, port 3003, CORS enabled, global ValidationPipe (no Redis/WebSocket adapter)                                          |
| `src/app.module.ts`      | TypeORM.forRoot + ShiftModule + BookingModule (no PostGraphile, no AI)                                                             |
| `src/config/postgres.ts` | Same pattern, defaults to port 54323, db `shift_marketplace`                                                                       |
| `src/config/typeorm.ts`  | Same pattern, SnakeNamingStrategy, `synchronize: true` for POC                                                                     |
| `src/config/entities.ts` | Exports `[Facility, Professional, Shift, Booking]`                                                                                 |

### Entities

**Facility** — `src/modules/shift/entities/facility.entity.ts`

```typescript
@Entity('facility')
export class Facility {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'varchar', length: 20 }) type: FacilityType;
  @Column({ type: 'boolean', default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;

  @OneToMany(() => Shift, (shift) => shift.facility)
  shifts: Shift[];
}

export type FacilityType = 'nursing_home' | 'hospital' | 'clinic';
```

**Professional** — `src/modules/shift/entities/professional.entity.ts`

```typescript
@Entity('professional')
export class Professional {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 255 }) name: string;
  @Column({ type: 'varchar', length: 10 }) qualification: Qualification;
  @Column({ type: 'boolean', default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

export type Qualification = 'CNA' | 'LPN' | 'RN';
```

**Shift** — `src/modules/shift/entities/shift.entity.ts`

```typescript
@Entity('shift')
@Index(['status', 'qualificationRequired', 'startTime'])
@Index(['facilityId', 'startTime'])
export class Shift {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) facilityId: string;
  @ManyToOne(() => Facility, (f) => f.shifts)
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @Column({ type: 'varchar', length: 10 }) qualificationRequired: Qualification;
  @Column({ type: 'timestamptz' }) startTime: Date;
  @Column({ type: 'timestamptz' }) endTime: Date;
  @Column({ type: 'int' }) payRateCents: number;
  @Column({ type: 'varchar', length: 20, default: 'open' }) status: ShiftStatus;

  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;

  @OneToOne(() => Booking, (b) => b.shift)
  booking: Booking;
}

export type ShiftStatus = 'open' | 'booked' | 'completed' | 'cancelled';
```

**Booking** — `src/modules/booking/entities/booking.entity.ts`

```typescript
@Entity('booking')
@Index(['professionalId', 'status'])
export class Booking {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid', unique: true }) shiftId: string;
  @OneToOne(() => Shift, (s) => s.booking)
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @Column({ type: 'uuid' }) professionalId: string;
  @ManyToOne(() => Professional)
  @JoinColumn({ name: 'professional_id' })
  professional: Professional;

  @Column({ type: 'varchar', length: 20, default: 'confirmed' }) status: BookingStatus;
  @Column({ type: 'timestamptz', default: () => 'NOW()' }) bookedAt: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

export type BookingStatus = 'confirmed' | 'completed' | 'cancelled';
```

### DTOs

**CreateShiftDto** — `src/modules/shift/dto/create-shift.dto.ts`

```typescript
export class CreateShiftDto {
  @IsUUID() facilityId: string;
  @IsIn(['CNA', 'LPN', 'RN']) qualificationRequired: Qualification;
  @IsDateString() startTime: string;
  @IsDateString() endTime: string;
  @IsInt() @Min(1) payRateCents: number;
}
```

**BookShiftDto** — `src/modules/booking/dto/book-shift.dto.ts`

```typescript
export class BookShiftDto {
  @IsUUID() professionalId: string;
}
```

### Shift module

`src/modules/shift/shift.module.ts` — `TypeOrmModule.forFeature([Facility, Professional, Shift])`

`src/modules/shift/shift.controller.ts`:

```
@Controller('api')

POST   /api/shifts                — @Body() CreateShiftDto → ShiftService.create()
GET    /api/shifts                — @Query() status?, qualification? → ShiftService.findAll()
GET    /api/shifts/:id            — @Param() id → ShiftService.findOne()
GET    /api/facilities            — ShiftService.listFacilities()
GET    /api/professionals         — ShiftService.listProfessionals()
```

`src/modules/shift/shift.service.ts`:

- `create(dto)` — validate facility exists, validate endTime > startTime, save shift, return with facility name
- `findAll(status?, qualification?)` — query builder with optional where clauses, join facility, left join booking + professional
- `findOne(id)` — find by id, join facility + booking + professional, throw NotFoundException
- `listFacilities()` — find all active facilities
- `listProfessionals()` — find all active professionals

### Booking module

`src/modules/booking/booking.module.ts` — `TypeOrmModule.forFeature([Booking, Shift, Professional])`, imports ShiftModule if needed

`src/modules/booking/booking.controller.ts`:

```
@Controller('api/shifts')

POST   /api/shifts/:id/book      — @Param() id, @Body() BookShiftDto → BookingService.bookShift()
```

`src/modules/booking/booking.service.ts` — the critical service:

```typescript
async bookShift(shiftId: string, dto: BookShiftDto): Promise<ShiftWithBooking> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Lock the shift row
    const shift = await queryRunner.manager
      .getRepository(Shift)
      .createQueryBuilder('shift')
      .setLock('pessimistic_write')
      .leftJoinAndSelect('shift.facility', 'facility')
      .where('shift.id = :id', { id: shiftId })
      .getOne();

    if (!shift) throw new NotFoundException('Shift not found');
    if (shift.status !== 'open') throw new ConflictException('Shift is already booked');

    // Validate professional
    const professional = await queryRunner.manager.findOneBy(Professional, { id: dto.professionalId });
    if (!professional) throw new NotFoundException('Professional not found');
    if (professional.qualification !== shift.qualificationRequired) {
      throw new BadRequestException(
        `Professional qualification '${professional.qualification}' does not match required '${shift.qualificationRequired}'`
      );
    }

    // Create booking + update shift
    const booking = queryRunner.manager.create(Booking, {
      shiftId, professionalId: dto.professionalId,
    });
    await queryRunner.manager.save(booking);
    shift.status = 'booked';
    await queryRunner.manager.save(shift);
    await queryRunner.commitTransaction();

    return { ...shift, booking: { ...booking, professional } };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

### Seed script

`src/cli/seed.ts`:

- 3 facilities: "Sunrise Nursing Home" (nursing_home), "Metro General Hospital" (hospital), "Downtown Clinic" (clinic)
- 5 professionals: "Alice Johnson" (RN), "Bob Smith" (CNA), "Carol Williams" (LPN), "David Brown" (CNA), "Eva Martinez" (LPN)
- Upsert pattern to avoid duplicates on re-run

---

## Phase 2: Frontend — `apps/shift-ui`

### Files to create

| File                                                        | Based on                                                                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `package.json`                                              | `apps/tictactoe/package.json` (Next.js 14, React 18, Tailwind; remove Apollo, GraphQL, Socket.io deps) |
| `tsconfig.json`                                             | `apps/tictactoe/tsconfig.json` (extends shared, @/\* alias)                                            |
| `next.config.js`, `postcss.config.js`, `tailwind.config.ts` | Copy from `apps/tictactoe/`                                                                            |
| `.env.example`                                              | `NEXT_PUBLIC_API_URL=http://localhost:3003`                                                            |
| `src/app/globals.css`                                       | Copy from `apps/tictactoe/` (Tailwind base + shadcn theme vars)                                        |
| `src/lib/utils.ts`                                          | Copy `cn()` utility from `apps/tictactoe/`                                                             |
| `src/components/ui/`                                        | Copy button, card, badge, select from `apps/tictactoe/`                                                |

### Types — `src/types/shift.ts`

```typescript
export type FacilityType = 'nursing_home' | 'hospital' | 'clinic';
export type Qualification = 'CNA' | 'LPN' | 'RN';
export type ShiftStatus = 'open' | 'booked' | 'completed' | 'cancelled';

export interface Facility {
	id: string;
	name: string;
	type: FacilityType;
}

export interface Professional {
	id: string;
	name: string;
	qualification: Qualification;
}

export interface BookingInfo {
	id: string;
	professionalId: string;
	professionalName: string;
	status: string;
	bookedAt: string;
}

export interface Shift {
	id: string;
	facilityId: string;
	facilityName: string;
	qualificationRequired: Qualification;
	startTime: string;
	endTime: string;
	payRateCents: number;
	status: ShiftStatus;
	booking: BookingInfo | null;
	createdAt: string;
}
```

### API client — `src/lib/api/shiftApi.ts`

Same fetch wrapper pattern as `apps/tictactoe/src/lib/api/gameApi.ts`:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3003';

// apiFetch<T>(path, options) — generic fetch wrapper

export async function listFacilities(): Promise<Facility[]>;
export async function listProfessionals(): Promise<Professional[]>;
export async function createShift(dto: CreateShiftInput): Promise<Shift>;
export async function listShifts(params?: {
	status?: string;
	qualification?: string;
}): Promise<Shift[]>;
export async function getShift(id: string): Promise<Shift>;
export async function bookShift(
	shiftId: string,
	professionalId: string,
): Promise<Shift>;
```

### Pages

**Layout** — `src/app/layout.tsx`

- Title: "Shift Marketplace"
- Nav bar with two links: "Facility Dashboard" (`/facility`) and "Professional Dashboard" (`/professional`)

**Home** — `src/app/page.tsx`

- Redirect to `/facility` or render simple landing with links to both dashboards

**Facility Dashboard** — `src/app/facility/page.tsx`

- `'use client'`
- State: selected facility, shifts list, form fields, loading/error
- On mount: fetch facilities for dropdown
- On facility select: fetch shifts filtered by facility
- Form: qualification dropdown (CNA/LPN/RN), start/end datetime inputs, pay rate (dollars → cents)
- Submit: POST /api/shifts, refetch shifts list
- Shift list: each row shows qualification, time, pay, status badge (open = green, booked = blue), professional name if booked

**Professional Dashboard** — `src/app/professional/page.tsx`

- `'use client'`
- State: selected professional, available shifts, my shifts, loading/error
- On mount: fetch professionals for dropdown
- On professional select: fetch open shifts filtered by qualification, fetch booked shifts for this professional
- Available shifts: each row shows facility name, time, pay, "Book" button
- Book button: POST /api/shifts/:id/book, handle 409 (already booked) and 400 (qualification mismatch) errors inline
- My Shifts section: shows shifts this professional has booked

---

## Implementation Order

1. **Backend scaffolding** — package.json, tsconfig, nest-cli.json, docker-compose, configs, main.ts, app.module
2. **Entities** — all 4 entities with TypeORM decorators, relationships, indexes
3. **Shift module** — controller + service + DTO (POST, GET list, GET by id, list facilities, list professionals)
4. **Booking module** — controller + service + DTO (POST book with pessimistic locking)
5. **Seed script** — 3 facilities + 5 professionals
6. **Install + start** — `pnpm install`, `pnpm docker:up`, `pnpm dev`, test with curl
7. **Frontend scaffolding** — package.json, configs, copy UI components, types, API client
8. **Facility page** — form + shift list with status badges
9. **Professional page** — shift browser + booking + inline error handling
10. **End-to-end test** — full flow across both dashboards

## Verification

1. `cd apps/shift-api && pnpm docker:up` — PostgreSQL starts on 54323
2. `pnpm dev` — backend on 3003, tables auto-created (synchronize: true)
3. `pnpm seed` — 3 facilities + 5 professionals inserted
4. `curl -X POST http://localhost:3003/api/shifts -H 'Content-Type: application/json' -d '{"facilityId":"<uuid>","qualificationRequired":"CNA","startTime":"2025-01-15T07:00:00Z","endTime":"2025-01-15T15:00:00Z","payRateCents":2500}'` — 201, shift returned
5. `curl -X POST http://localhost:3003/api/shifts/<shift-id>/book -H 'Content-Type: application/json' -d '{"professionalId":"<cna-uuid>"}'` — 200, status = booked
6. Same curl again — 409, "Shift is already booked"
7. `cd apps/shift-ui && pnpm dev` — frontend on 2026
8. Facility dashboard: select facility, post shift, see it listed as "open"
9. Professional dashboard: select matching professional, see shift, click "Book"
10. Facility dashboard: shift now shows "booked" with professional name
11. Professional dashboard: try booking same shift with different professional — error shown inline
