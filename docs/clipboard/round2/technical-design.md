# Technical Design: Urgent Shifts

# Context

## Problem

Worker no-shows are the top reliability concern for Red Planet Staffing. When a shift goes unfilled close to its start time — whether because a worker cancelled, never claimed it, or simply didn't show up — the workplace is left short-staffed with no time to find a replacement. This is driving workplace churn, and our competitor Rust Workers is winning on attendance reliability.

## Solution

Introduce an **Urgent Shifts** feature: any shift that is unclaimed and approaching its start time is automatically marked as urgent with an elevated pay rate, driving rapid claiming by available workers. Workers with upcoming claimed shifts receive proactive notifications as a reminder. The system treats urgency as a **temporal condition** — a shift is urgent when it's unfilled and starting soon, regardless of how it got there (cancelled, declined, or never claimed).

The system is designed for **experimentation** — notification timing and pay rates are configurable via environment variables so we can tune the values based on real-world data without redeployment.

### Assumptions

- While no-shows are the inspiration for this feature, filled shifts are the success metric. That's why we don't care 'how' a shift is urgent (canceled or never booked)
- Workers need to account for transit time for last minute shift claims
- Specific notification to worker is defined by Project Manager, so we aren't toying with anything like pay matching if the reason for cancelation is that the worker got a better offer.

## Customer Data Analysis

Analysis of 73 cancellations from August 2024 (`docs/customer-data.md`) at three notification windows:

| Notification Window | Cancellations Caught (>= window) | Catch Rate | Replacement Viability                 |
| ------------------- | -------------------------------- | ---------- | ------------------------------------- |
| **30 min**          | 64 / 73                          | **88%**    | Insufficient — 45 min minimum transit |
| **45 min**          | 53 / 73                          | **73%**    | Tight — just enough for transit       |
| **60 min**          | 51 / 73                          | **70%**    | Comfortable — allows transit + prep   |

Key insight from customer interview (Jesse Covington): _"It takes at least 45 minutes to get anywhere on this planet."_ A 30-minute window catches the most cancellations but doesn't leave enough time for a replacement worker to physically arrive. The difference between 60 min (70%) and 30 min (88%) is only 18 percentage points, but the replacement viability improvement is dramatic.

**Recommendation**: Default to a **60-minute notification window**, but make this configurable to enable data-driven experimentation across different lead times and pay rates.

## Scope

### In-Scope

- Data model changes to the `Shift` table (`urgentPayRate`, `notifiedAt`)
- Computed `isUrgent` field in the DTO layer (derived from `urgentPayRate IS NOT NULL`, not stored)
- Urgency-aware cancel endpoint (sets elevated pay rate when cancelling within the urgent window)
- Two cron jobs: urgency marking (unclaimed shifts) and worker notification (claimed shifts)
- `NotificationService` interface with mock implementation
- `ConfigModule` integration for configurable lead time and pay rates
- Frontend: urgent badge, pay rate display, sort urgent shifts to top
- Removal of `mockHourlyPay` utility (replaced by real `urgentPayRate` from API)

### Out-of-Scope

- Notification delivery infrastructure (assumes internal notification service exists)
- GPS-based worker location detection (Martian GPS out of commission)
- Workplace dashboard for monitoring urgent shifts
- Worker penalty system for repeated cancellations
- Dynamic/auction-based pay rates
- Rate-gaming prevention (worker cancels within urgent window then re-claims at elevated rate) — monitor for abuse post-launch; blocking re-claims risks reducing fill rates in thin marketplaces
- Standard per-shift pay rate column — `urgentPayRate` covers the urgent case only; a general `payRate` field for non-urgent shift pricing is a separate initiative
- Cancel endpoint authorization — the existing `POST /shifts/:id/cancel` does not verify that the caller is the assigned worker; any client with the shift ID can cancel. Auth and ownership validation are a broader API concern, not specific to urgent shifts
- Complex notification solutions such as pay matching when the reason for canceling is about money.

# Technical Overview

Two cron jobs run every 5 minutes. The **urgency cron** finds unclaimed shifts starting within a configurable lead time window (default 60 minutes) and sets `urgentPayRate` to the configured urgent rate (default $50/hr). The **notification cron** finds claimed shifts in the same window and sends reminders to assigned workers via a `NotificationService` interface. If a worker can't make their shift, they use the existing `POST /shifts/:id/cancel` endpoint, which now checks whether the shift falls within the urgent window — if so, it immediately sets `urgentPayRate` alongside the standard cancel behavior. On the frontend, urgent shifts sort to the top and display an orange "URGENT" chip with the elevated pay rate. Urgency is not stored as a separate column; instead, `isUrgent` is derived at response time in the DTO mapper from `urgentPayRate IS NOT NULL`. All key parameters — notification lead time, urgent pay rate — are managed via NestJS `ConfigModule` backed by environment variables, enabling experimentation without code changes.

## Diagram

### System Architecture

```
+------------------+  HTTP   +-------------------+
|   React Client   |-------->|    NestJS API     |
+------------------+         +--------+----------+
                                      |
                    +-----------------+------------------+
                    |                 |                   |
           +-------+-------+ +-------+--------+ +-------+--------+
           | Shifts        | | UrgencyMarking | | Notification   |
           | Service       | | CronService    | | CronService    |
           |               | | (*/5 min)      | | (*/5 min)      |
           | - cancel() w/ | |                | |                |
           |   urgency     | | Sets           | | Sends          |
           |   check       | | urgentPayRate  | | reminders to   |
           | - get() w/    | | on unclaimed   | | claimed workers|
           |   derived     | +----------------+ +-------+--------+
           |   isUrgent    |                            |
           +---------------+                            v
                                                +-------+--------+
                                                | Internal       |
                                                | Notification   |
                                                | Service        |
                                                | (existing)     |
                                                +----------------+

           Shared Dependencies (injected via DI):
           +---------------+   +-------------+
           | ConfigModule  |   | Prisma ORM  |
           | Lead time     |   | SQLite DB   |
           | Pay rates     |   | (dev.db)    |
           +---------------+   +-------------+
```

### Flow 1: Urgency Marking Cron (Unclaimed Shifts)

```
  +-------------------+
  | Cron (every 5 min)|
  +--------+----------+
           |
           v
  +--------+-------------------+
  | Query shifts WHERE:        |
  |   workerId IS NULL         |
  |   startAt > now()          |
  |   startAt <= now() + {lead}|
  |   urgentPayRate IS NULL    |
  +--------+-------------------+
           |
           v
  +--------+-------------------+
  | For each shift:            |
  |   Set urgentPayRate =      |
  |     URGENT_PAY_RATE        |
  +----------------------------+
```

### Flow 2: Notification Cron (Claimed Shifts)

```
  +-------------------+
  | Cron (every 5 min)|
  +--------+----------+
           |
           v
  +--------+-------------------+
  | Query shifts WHERE:        |
  |   workerId IS NOT NULL     |
  |   startAt > now()          |
  |   startAt <= now() + {lead}|
  |   notifiedAt IS NULL       |
  |   cancelledAt IS NULL      |
  +--------+-------------------+
           |
           v
  +--------+-------------------+
  | For each shift:            |
  |   Send notification via    |
  |   NotificationService      |
  +--------+-------------------+
           |
           v
  +--------+-------------------+
  | Set notifiedAt = now()     |
  +----------------------------+
```

### Flow 3: Cancel Within Urgent Window

```
  +---------------------+
  | Worker cancels shift |
  +----------+----------+
             |
             v
  +----------+----------+
  | POST /shifts/:id    |
  |      /cancel        |
  +----------+----------+
             |
             v
  +----------+-----------+
  | Standard cancel:     |
  |  workerId = null     |
  |  cancelledAt = now() |
  +----------+-----------+
             |
             v
  +----------+-----------+
  | Is startAt within    |
  | urgent window?       |
  +--+---------------+--+
     |               |
     v YES           v NO
  +--+------------+ +--+----------+
  | Set urgentPay | | urgentPay  |
  |  Rate = config| | Rate       |
  |               | | unchanged  |
  +--+------------+ +--+---------+
     |                  |
     v                  v
  +--+------------------+-+
  | Shift returned with   |
  | isUrgent derived from |
  | urgentPayRate in DTO  |
  +------------------------+
```

## Data Model

### Prisma Schema Changes

Two new fields added to the existing `Shift` model:

```prisma
model Shift {
  id          Int       @id @default(autoincrement())
  createdAt   DateTime  @default(now()) @map("created_at")
  startAt     DateTime  @map("start_at")
  endAt       DateTime  @map("end_at")
  jobType     String    @map("job_type")
  workplaceId Int       @map("workplace_id")
  workerId    Int?      @map("worker_id")
  shard       Int       @default(0)
  cancelledAt DateTime? @map("cancelled_at")

  // New fields for Urgent Shifts
  urgentPayRate  Float?    @map("urgent_pay_rate")
  notifiedAt     DateTime? @map("notified_at")

  worker    Worker?   @relation(fields: [workerId], references: [id])
  workplace Workplace @relation(fields: [workplaceId], references: [id])
}
```

**Why `isUrgent` is derived rather than stored**: `isUrgent` is functionally dependent on `urgentPayRate` — whenever `urgentPayRate` is set, the shift is urgent; whenever it's null, it's not. Storing both is redundant. The column is named `urgentPayRate` (not `payRate`) to explicitly scope it to urgent shifts, leaving room for a future general `payRate` column without ambiguity. If urgency ever genuinely decouples from pay rate, adding an `isUrgent` column is a cheap additive migration.

### Migration Strategy

Non-breaking migration. Both new fields have safe defaults:

- `urgentPayRate` defaults to `null` — existing shifts have no urgent pay rate
- `notifiedAt` defaults to `null` — existing shifts have not been notified

No backfill required. Existing data remains valid.

### Access Patterns & Indexes

| Query                                  | Used By           | Pattern                                                                                                                            |
| -------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Unclaimed shifts not yet marked urgent | Urgency cron      | `WHERE workerId IS NULL AND startAt > now() AND startAt <= now()+{leadTime}min AND urgentPayRate IS NULL`                          |
| Claimed shifts for notification        | Notification cron | `WHERE workerId IS NOT NULL AND startAt > now() AND startAt <= now()+{leadTime}min AND notifiedAt IS NULL AND cancelledAt IS NULL` |
| Shift by ID for cancel                 | Cancel endpoint   | `WHERE id = :id` (existing PK index)                                                                                               |

Recommended composite index for the cron queries:

```prisma
@@index([workerId, startAt, urgentPayRate], name: "idx_shift_urgency_cron")
@@index([workerId, startAt, notifiedAt], name: "idx_shift_notification_cron")
```

These indexes support the cron job query patterns. Without them, the cron queries would perform a full table scan every 5 minutes.

### Entity Relationship Diagram

```
+------------------+        +---------------------+        +------------------+
|     Worker       |        |       Shift         |        |    Workplace     |
+------------------+        +---------------------+        +------------------+
| id (PK)          |        | id (PK)             |        | id (PK)          |
| name             |        | createdAt           |        | name             |
| status           |        | startAt             |        | status           |
| shard            |        | endAt               |        | location         |
+------------------+        | jobType             |        | shard            |
        |                   | workplaceId (FK) ----------->+------------------+
        |                   | workerId (FK, ?)    |
        +------------------>| shard               |
                            | cancelledAt         |
  Worker 1 ----< 0..* Shift | urgentPayRate (NEW) | Shift 0..* >---- 1 Workplace
                            | notifiedAt    (NEW) |
                            +---------------------+
```

- A Worker has 0 or more Shifts (optional — `workerId` is nullable)
- A Workplace has 0 or more Shifts (required — `workplaceId` is not nullable)
- Relationships are unchanged by this feature

## Interface

### Configuration

Environment variables managed via NestJS `ConfigModule`:

| Variable                           | Default | Description                                               |
| ---------------------------------- | ------- | --------------------------------------------------------- |
| `URGENT_NOTIFICATION_LEAD_MINUTES` | `60`    | Minutes before shift start that defines the urgent window |
| `URGENT_PAY_RATE`                  | `50.00` | Hourly pay rate for urgent shifts ($)                     |

Injected into `UrgencyMarkingCronService`, `NotificationCronService`, and `ShiftsService` via `ConfigService`.

### Backend Endpoints

#### `POST /shifts/:id/cancel` (Updated)

Existing cancel endpoint gains urgency awareness.

**Existing behavior (unchanged):**

- Validates shift exists, has a `workerId`
- Sets `workerId = null`, `cancelledAt = now()`

**New behavior (added):**

- After standard cancel logic, checks if `startAt` is within the urgent window (`startAt - now() <= URGENT_NOTIFICATION_LEAD_MINUTES`)
- If within the urgent window: sets `urgentPayRate = URGENT_PAY_RATE` from config
- If outside the urgent window: `urgentPayRate` unchanged

**Response** (updated shape with new fields):

```json
{
	"data": {
		"id": 123,
		"createdAt": "2024-08-01T06:15:00.000Z",
		"startAt": "2024-08-01T08:00:00.000Z",
		"endAt": "2024-08-01T16:00:00.000Z",
		"jobType": "mining",
		"workplaceId": 1,
		"workerId": null,
		"cancelledAt": "2024-08-01T06:45:00.000Z",
		"isUrgent": true,
		"urgentPayRate": 50.0,
		"notifiedAt": "2024-08-01T06:00:00.000Z"
	}
}
```

#### Updated ShiftDTO

```typescript
// Resulting response shape:
{
	id: number;
	createdAt: string;
	startAt: string;
	endAt: string;
	jobType: string;
	workplaceId: number;
	workerId: number | null;
	cancelledAt: string | null;
	isUrgent: boolean; // Derived: urgentPayRate != null
	urgentPayRate: number | null;
	notifiedAt: string | null;
}
```

#### `toShiftDTO` Mapper Update

The mapper derives `isUrgent` from `urgentPayRate`:

```typescript
export function toShiftDTO(shift: Shift): ShiftDTO {
	const {
		createdAt,
		startAt,
		endAt,
		cancelledAt,
		notifiedAt,
		urgentPayRate,
		...rest
	} = omitShard(shift);
	return {
		...rest,
		createdAt: createdAt.toISOString(),
		startAt: startAt.toISOString(),
		endAt: endAt.toISOString(),
		cancelledAt: cancelledAt?.toISOString() ?? null,
		notifiedAt: notifiedAt?.toISOString() ?? null,
		isUrgent: urgentPayRate != null,
		urgentPayRate,
	};
}
```

#### `GET /shifts` (Updated)

The response DTO now includes `isUrgent`, `urgentPayRate`, and `notifiedAt` fields. `isUrgent` is derived in the mapper from `urgentPayRate IS NOT NULL`. No new query parameters required — the frontend sorts urgent shifts client-side based on the `isUrgent` field.

#### Existing Endpoints (Unchanged)

- `POST /shifts/:id/claim` — claiming an urgent shift works the same way. `urgentPayRate` persists through claim (the rate is a financial commitment, and `isUrgent` remains derived from it). `cancelledAt` cleared as before.

#### UrgencyMarkingCronService

```typescript
@Injectable()
export class UrgencyMarkingCronService {
  constructor(
    private readonly shiftsService: ShiftsService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async markUrgentShifts(): Promise<void> {
    const leadMinutes = this.configService.get<number>(
      'URGENT_NOTIFICATION_LEAD_MINUTES', 60
    );
    const urgentPayRate = this.configService.get<number>('URGENT_PAY_RATE', 50);
    await this.shiftsService.markUnclaimedShiftsAsUrgent(leadMinutes, urgentPayRate);
  }
}
```

#### NotificationCronService

```typescript
@Injectable()
export class NotificationCronService {
  constructor(
    private readonly shiftsService: ShiftsService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async notifyUpcomingShifts(): Promise<void> {
    const leadMinutes = this.configService.get<number>(
      'URGENT_NOTIFICATION_LEAD_MINUTES', 60
    );
    const shifts = await this.shiftsService.getUpcomingClaimedShifts(leadMinutes);

    for (const shift of shifts) {
      await this.notificationService.sendShiftReminder(shift);
      await this.shiftsService.markNotified(shift.id);
    }
  }
}
```

#### NotificationService Interface

```typescript
export interface NotificationService {
	sendShiftReminder(shift: Shift): Promise<void>;
}
```

A `MockNotificationService` implementation will log to console during development. Production swaps in the real internal service via dependency injection.

### Frontend Changes

#### `client/src/types/index.ts`

Add new fields to the `Shift` interface:

```typescript
export interface Shift {
	id: number;
	createdAt: string;
	startAt: string;
	endAt: string;
	workplaceId: number;
	workerId: number | null;
	cancelledAt: string | null;
	isUrgent: boolean; // NEW — derived by backend from urgentPayRate != null
	urgentPayRate: number | null; // NEW — set when shift enters urgent window
	notifiedAt: string | null; // NEW — set when worker is notified
}
```

#### `client/src/components/ShiftCard.tsx`

- Display an orange MUI `Chip` with label "URGENT" when `shift.isUrgent` is `true`
- Display pay rate as `$X/hr` from `shift.urgentPayRate` when present

#### `client/src/components/AvailableShifts.tsx`

- Sort available shifts so urgent shifts appear at the top of the list
- Replace `mockHourlyPay` with real `urgentPayRate` from the shift object when shift is urgent.

### Urgency Lifecycle

```
1. Shift created                         --> urgentPayRate = null (isUrgent = false in DTO)
2a. Unclaimed + enters urgent window     --> urgency cron sets urgentPayRate = URGENT_PAY_RATE
2b. Worker cancels within urgent window  --> cancel endpoint sets urgentPayRate = URGENT_PAY_RATE
3. Worker claims urgent shift            --> urgentPayRate persists (financial commitment)
4. Worker cancels again (still in window)--> urgentPayRate already set, stays
5. Another worker claims                 --> urgentPayRate persists. Shift filled.

```

### Files Modified

| File                                                                        | Change                                                                                                               |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `server/prisma/schema.prisma`                                               | Add `urgentPayRate`, `notifiedAt` to Shift                                                                           |
| `server/src/modules/shifts/shifts.controller.ts`                            | Update cancel to inject `ConfigService`, pass urgency params                                                         |
| `server/src/modules/shifts/shifts.service.ts`                               | Add urgency check in `cancel()`, add `markUnclaimedShiftsAsUrgent()`, `getUpcomingClaimedShifts()`, `markNotified()` |
| `server/src/modules/shifts/shifts.schemas.ts`                               | Update ShiftDTO type to include `isUrgent` (derived), `urgentPayRate`                                                |
| `server/src/modules/shifts/shifts.mapper.ts`                                | Derive `isUrgent` from `urgentPayRate != null`, serialize `notifiedAt` to ISO string                                 |
| `server/src/app.module.ts`                                                  | Import `ScheduleModule`, `ConfigModule`, `NotificationsModule`                                                       |
| **New:** `server/src/modules/notifications/urgency-marking-cron.service.ts` | Cron job for marking unclaimed shifts as urgent                                                                      |
| **New:** `server/src/modules/notifications/notification-cron.service.ts`    | Cron job for sending worker reminders                                                                                |
| **New:** `server/src/modules/notifications/notification.service.ts`         | Interface + mock implementation                                                                                      |
| **New:** `server/src/modules/notifications/notifications.module.ts`         | Module wiring                                                                                                        |
| `client/src/types/index.ts`                                                 | Add `isUrgent`, `urgentPayRate`, `notifiedAt` to Shift                                                               |
| `client/src/components/ShiftCard.tsx`                                       | Urgent chip badge, pay rate display                                                                                  |
| `client/src/components/AvailableShifts.tsx`                                 | Sort urgent to top, use real `urgentPayRate`                                                                         |

## Metrics

### Business Metrics

- **Urgent shift volume**: Count of shifts with `urgentPayRate IS NOT NULL` per week — measures the scale of the unfilled-shift problem
- **Re-fill rate**: Percentage of urgent shifts that are claimed before `startAt` — the core success metric
- **Time-to-refill**: Median time between `urgentPayRate` being set and the shift being claimed — measures how quickly the marketplace responds
- **Subsidy cost**: Total additional pay from urgent rate premium (`URGENT_PAY_RATE - STANDARD_PAY_RATE`) \* hours — tracks the cost of the incentive
- **Workplace churn rate**: Month-over-month change in active workplace count — the ultimate business outcome

### Experimentation Metrics

- Compare re-fill rate, time-to-refill, and subsidy cost across different `URGENT_NOTIFICATION_LEAD_MINUTES` values (e.g., 45 vs 60 vs 90 min)
- Compare re-fill rate and subsidy cost across different `URGENT_PAY_RATE` values (e.g., $40 vs $50 vs $60)
- Track what percentage of urgent shifts originated from cancellations vs never-claimed

### Operational Metrics

- **Notification delivery rate**: Percentage of notifications successfully sent (from NotificationService response)
- **Notification-to-cancel conversion**: Percentage of notified workers who subsequently cancel — measures whether reminders prompt honest early cancellation
- **Cron execution health**: Cron run count, duration, and error rate per interval for both urgency marking and notification crons

### Technical Metrics

- **Cron query latency**: P50/P95/P99 of both cron queries — monitors index effectiveness
- **Cancel endpoint latency**: P50/P95/P99 of `POST /shifts/:id/cancel` — should remain comparable to current baseline despite added urgency check
- **Database growth**: Rate of `urgentPayRate` and `notifiedAt` field population — monitors storage impact

# Delivery Milestones

## Phase 1 — Data Model + Config + Urgency-Aware Cancel

- Prisma migration: add `urgentPayRate`, `notifiedAt` fields with defaults
- Add composite indexes for cron query performance
- Integrate NestJS `ConfigModule` with environment variable defaults
- Update `ShiftDTO` type, Zod schemas for new fields
- Update `toShiftDTO` mapper to derive `isUrgent` from `urgentPayRate != null` and serialize `notifiedAt`
- Add urgency check to `cancel()` in `ShiftsService` — set `urgentPayRate` when cancelling within urgent window
- Unit and E2E tests for urgency-aware cancel and updated DTO shape

## Phase 2 — Cron Jobs

- Install and configure `@nestjs/schedule` (`ScheduleModule` in `AppModule`)
- Create `NotificationsModule` with two cron services:
  - `UrgencyMarkingCronService` — marks unclaimed shifts as urgent (sets `urgentPayRate`)
  - `NotificationCronService` — sends reminders to claimed workers (sets `notifiedAt`)
- Define `NotificationService` interface
- Implement `MockNotificationService` (console logging for dev)
- Add `markUnclaimedShiftsAsUrgent()`, `getUpcomingClaimedShifts()`, and `markNotified()` to `ShiftsService`
- Test both cron jobs with mock service

## Phase 3 — Frontend Updates

- Update `Shift` TypeScript interface with `isUrgent`, `urgentPayRate`, `notifiedAt`
- Add orange "URGENT" `Chip` to `ShiftCard.tsx` when `shift.isUrgent`
- Display `urgentPayRate` as `$X/hr` on shift cards
- Sort urgent shifts to top in `AvailableShifts.tsx`
- Remove `client/src/utils/mocked-pay.ts` and its import

## Phase 4 — Integration + Release

- Swap `MockNotificationService` for real internal notification service
- End-to-end testing across the full flow (notification -> cancel -> urgent listing -> reclaim)
- Set up monitoring dashboards for business and operational metrics
- Deploy with default configuration (`60 min`, `$50/hr`)
- Begin experimentation: adjust `URGENT_NOTIFICATION_LEAD_MINUTES` and `URGENT_PAY_RATE` based on observed metrics

# Abandoned Ideas

### 1. Stored `isUrgent` boolean column

Considered adding an explicit `isUrgent` boolean set alongside `urgentPayRate` by the cron and cancel endpoint. However, `isUrgent` is functionally dependent on `urgentPayRate` (violating 3NF), creates data drift risk when one is updated without the other. If urgency genuinely decouples from pay rate in the future, adding the column is a cheap additive migration.

### 2. Separate `POST /shifts/:id/decline` endpoint

A dedicated decline endpoint would distinguish "worker responds to notification saying they can't attend" from "worker proactively cancels." However, from the workplace's perspective, the distinction doesn't matter — an unfilled shift close to start time is urgent regardless of how it became unfilled. Reusing the existing `/cancel` endpoint with an urgency check is simpler, avoids API surface expansion, and catches all cases (cancel, never-claimed, etc.) through the same urgency window logic.

### 3. Dynamic/auction-based pay rates

Letting the market set urgent pay rates (e.g., increasing the rate over time as the shift approaches) adds significant complexity for MVP. The configurable flat rate approach is simpler while still enabling experimentation — we can adjust the rate based on observed re-fill rates and converge on the optimal value.

### 4. Fixed 30-minute notification window as default

While a 30-minute window catches 88% of cancellations (vs 70% at 60 minutes), the Martian transit time minimum of 45 minutes means replacement workers physically cannot arrive in time. A 60-minute default provides a comfortable margin for transit plus preparation, and configurability allows us to test tighter windows if transit conditions improve.
