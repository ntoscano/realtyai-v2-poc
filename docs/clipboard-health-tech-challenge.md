# Clipboard Health — Principal Engineer Technical Challenge

Two-part interview simulation: (1) Architecture design for a healthcare shift marketplace (45 min), (2) Build a fullstack POC of the core marketplace flow (1 hour).

---

## Part 1: Architecture Challenge (45 minutes)

### Scenario

You are building the backend and frontend for a healthcare shift marketplace. The system connects facilities (nursing homes, hospitals, clinics) with healthcare professionals (RNs, LPNs, CNAs) who pick up shifts on demand.

Design a production-quality architecture for the following features:

1. **Shift posting**: A facility posts a shift with a required qualification, time window, and pay rate.
2. **Shift discovery**: A professional browses available shifts filtered by their qualification.
3. **Shift booking**: A professional books an open shift. Only one professional can book a given shift. Concurrent booking attempts must be handled safely.
4. **Status tracking**: Both sides see updated shift status (open, booked, completed, cancelled).

### Deliverables

Produce the following (whiteboard, markdown, or diagrams):

1. **System diagram** — Backend services/modules, frontend, database, and communication flow.
2. **Data model** — Entities, relationships, column types, indexes, and constraints.
3. **API design** — Endpoints for the shift lifecycle (create, list, book).
4. **Service architecture** — How you organize backend code. What lives where. Validation strategy.
5. **Concurrency strategy** — How you prevent double-booking.
6. **Security** — Input validation, authorization, data integrity.
7. **Scalability notes** — What would change if this system grew to thousands of facilities and shifts.
8. **Trade-offs** — For each major decision, name an alternative and why you chose what you chose.

### Evaluation Criteria

| Dimension                  | What we look for                                                                                                                                                |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain modeling**        | Entities reflect the domain. Relationships are correct (Facility 1:N Shift, Shift 1:1 Booking). Enums and constraints enforce business rules at the data layer. |
| **Trade-off articulation** | Every decision names an alternative. "We could do X, but Y is better here because Z."                                                                           |
| **Failure mode awareness** | What happens when two professionals book the same shift? When invalid data is submitted? When the database is slow?                                             |
| **Code organization**      | Clean separation: controllers validate and delegate, services contain business logic, entities are data containers.                                             |
| **Pragmatism**             | Appropriate complexity. Not everything needs a message queue. The right answer at this scale might be a well-structured monolith.                               |

---

### Reference Architecture (Answer Key)

One well-reasoned approach. Not the only valid architecture.

#### System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Facility View   │         │ Professional View│         │
│  │  (Next.js)       │         │ (Next.js)        │         │
│  │  /facility       │         │ /professional    │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
└───────────┼────────────────────────────┼────────────────────┘
            │         REST (JSON)        │
            ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    NestJS Backend                            │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Controllers (validation, routing, error responses) │   │
│  │  POST /api/shifts    GET /api/shifts                │   │
│  │  POST /api/shifts/:id/book   GET /api/shifts/:id    │   │
│  │  GET /api/facilities   GET /api/professionals       │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  Services (business logic)                          │   │
│  │  ShiftService: create, list, getById                │   │
│  │  BookingService: bookShift (concurrency-safe)       │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │  TypeORM Repositories                               │   │
│  │  Facility | Professional | Shift | Booking          │   │
│  └──────────────────────┬──────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │     PostgreSQL        │
              │                       │
              │  Tables:              │
              │  - facility           │
              │  - professional       │
              │  - shift              │
              │  - booking            │
              │                       │
              │  Enums, indexes,      │
              │  foreign keys,        │
              │  unique constraints   │
              └───────────────────────┘
```

#### Data Model

**Facility**

```
facility
├── id: UUID (PK, generated)
├── name: VARCHAR(255) NOT NULL
├── type: ENUM('nursing_home', 'hospital', 'clinic') NOT NULL
├── is_active: BOOLEAN DEFAULT TRUE
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()
```

**Professional**

```
professional
├── id: UUID (PK, generated)
├── name: VARCHAR(255) NOT NULL
├── qualification: ENUM('CNA', 'LPN', 'RN') NOT NULL
├── is_active: BOOLEAN DEFAULT TRUE
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()
```

**Shift**

```
shift
├── id: UUID (PK, generated)
├── facility_id: UUID (FK → facility) NOT NULL
├── qualification_required: ENUM('CNA', 'LPN', 'RN') NOT NULL
├── start_time: TIMESTAMPTZ NOT NULL
├── end_time: TIMESTAMPTZ NOT NULL
├── pay_rate_cents: INTEGER NOT NULL  -- money stored as cents
├── status: ENUM('open', 'booked', 'completed', 'cancelled') DEFAULT 'open'
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()

INDEX (status, qualification_required, start_time) -- shift search
INDEX (facility_id, start_time) -- facility's shifts
CHECK (end_time > start_time)
CHECK (pay_rate_cents > 0)
```

**Booking**

```
booking
├── id: UUID (PK, generated)
├── shift_id: UUID (FK → shift) UNIQUE NOT NULL  -- one booking per shift
├── professional_id: UUID (FK → professional) NOT NULL
├── status: ENUM('confirmed', 'completed', 'cancelled') DEFAULT 'confirmed'
├── booked_at: TIMESTAMPTZ DEFAULT NOW()
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()

INDEX (professional_id, status) -- professional's bookings
```

**Relationships:**

- Facility 1:N Shift (a facility posts many shifts)
- Professional 1:N Booking (a professional books many shifts)
- Shift 1:1 Booking (a shift has at most one booking)

#### API Design

```
POST   /api/shifts                -- Facility posts a shift
GET    /api/shifts                -- List shifts (filter: status, qualification)
GET    /api/shifts/:id            -- Get shift with booking details
POST   /api/shifts/:id/book      -- Professional books a shift

GET    /api/facilities            -- List facilities (seed data)
GET    /api/professionals         -- List professionals (seed data)
```

**POST /api/shifts** — validated with class-validator or Zod:

- `facility_id` (UUID, required, must exist)
- `qualification_required` (enum, required)
- `start_time`, `end_time` (ISO 8601, required, end > start)
- `pay_rate_cents` (positive integer, required)
- Returns: 201 with shift object including facility name

**POST /api/shifts/:id/book** — the critical endpoint:

- `professional_id` (UUID, required, must exist)
- Validates: shift exists, shift is `open`, professional's qualification matches
- Returns: 200 with updated shift + booking, or 409 if already booked, 400 if qualification mismatch

#### Service Architecture

```
ShiftController
  → validates DTO (class-validator decorators)
  → delegates to ShiftService

ShiftService
  → create(): validates facility exists, creates shift
  → findAll(): filters by status/qualification, joins facility name
  → findOne(): loads shift with booking + relations

BookingController
  → validates DTO
  → delegates to BookingService

BookingService
  → bookShift(): runs inside a transaction with row-level locking
```

**Why separate ShiftService and BookingService:**
Booking has its own invariants (concurrency, qualification check, status transition). Keeping it in its own service makes the concurrency logic testable in isolation.

#### Concurrency Strategy — Booking

The core concurrency problem: two professionals click "Book" on the same shift at the same instant.

**Approach: Pessimistic locking with `SELECT ... FOR UPDATE`**

```sql
BEGIN;
  SELECT * FROM shift WHERE id = $1 AND status = 'open' FOR UPDATE;
  -- If no row returned → shift doesn't exist or is already booked → abort
  INSERT INTO booking (shift_id, professional_id, status) VALUES ($1, $2, 'confirmed');
  UPDATE shift SET status = 'booked', updated_at = NOW() WHERE id = $1;
COMMIT;
```

The `FOR UPDATE` lock on the shift row means the second concurrent transaction waits until the first commits or rolls back. After the first commits, the second transaction's `SELECT` returns `status = 'booked'` and the service returns 409.

**Why pessimistic over optimistic:** Low contention (2-10 professionals competing for one shift, not 10,000). Pessimistic locking is simpler — no retry loops, no version columns, no client-side conflict resolution. The lock is held for milliseconds.

**Alternative considered:** Optimistic locking (version column, check-and-set). Viable but requires the client to handle retries. Adds complexity without benefit at this contention level.

#### Security

1. **Input validation**: Every endpoint validates inputs with class-validator DTOs. Invalid requests get 400 with descriptive error messages. Defense-in-depth: validate at controller (DTO), validate again in service (business rules).
2. **Qualification enforcement**: The booking service checks `professional.qualification === shift.qualification_required`. This is a business rule, not just a filter — it's enforced server-side even if the frontend filters correctly.
3. **Foreign key integrity**: All IDs validated against the database. Cannot book a shift for a non-existent professional.
4. **Status enforcement**: Only `open` shifts can be booked. Status transitions are enforced in the service layer.

**Not implemented in POC but noted for production:**

- JWT authentication (each professional/facility has their own identity)
- Row-level authorization (a facility can only edit their own shifts)
- Rate limiting on booking endpoint
- Idempotency keys on POST endpoints

#### Scalability Notes

At the current POC scale, PostgreSQL handles everything. If this grew:

| Concern                   | Trigger                                               | Solution                                                                                                                                                               |
| ------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shift search latency      | 100K+ active shifts                                   | Add composite indexes. If insufficient, introduce Elasticsearch for faceted search (geo + qualification + time range + pay range). PostgreSQL remains source of truth. |
| Booking throughput        | 1K+ concurrent bookings/sec                           | Connection pooling (PgBouncer). The pessimistic lock strategy still works — contention is per-shift, not global.                                                       |
| Read vs. write divergence | Read traffic 100x write traffic                       | Read replicas for list queries. Bookings (writes) go to primary.                                                                                                       |
| Real-time status updates  | Facilities want instant booking notifications         | Add WebSocket layer (Socket.IO). Emit shift status events on booking.                                                                                                  |
| Notification fan-out      | Alert 1000 eligible professionals for an urgent shift | Extract notification to async worker. Use a message queue (SQS/Redis pub-sub).                                                                                         |

#### Trade-offs

| Decision                                    | Alternative                         | Rationale                                                                                                                                        |
| ------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| PostgreSQL                                  | SQLite (simpler setup)              | Foreign keys, enums, `FOR UPDATE` locking, and proper indexing. SQLite lacks row-level locking needed for concurrent booking.                    |
| TypeORM with `synchronize: true`            | Migrations                          | Acceptable for POC. In production, use migrations for reproducible schema changes.                                                               |
| Pessimistic locking (`FOR UPDATE`)          | Optimistic locking (version column) | Simpler at low contention. No retry logic needed.                                                                                                |
| Cents for money (`pay_rate_cents: INTEGER`) | Decimal or float                    | Integers avoid floating-point rounding. Standard practice for financial data.                                                                    |
| Separate Booking entity                     | Inline booking fields on Shift      | Clean separation of concerns. Booking has its own lifecycle (confirmed → completed → cancelled). Keeps Shift entity focused on shift definition. |
| NestJS modules (monolith)                   | Separate microservices              | Single deploy, shared database, simple. Module boundaries are sufficient at this scale. Extract when a module needs independent scaling.         |
| REST                                        | GraphQL                             | Simpler for a fixed set of endpoints. GraphQL adds value when clients need flexible queries across many entity types.                            |

---

## Part 2: Implementation Challenge (1 hour)

### Overview

Build a fullstack POC that demonstrates the core shift marketplace flow: a facility posts a shift, a professional finds and books it, and both sides see the updated status.

### Tech Stack

| Layer      | Technology                                       |
| ---------- | ------------------------------------------------ |
| Backend    | NestJS + TypeScript                              |
| Database   | PostgreSQL + TypeORM                             |
| Frontend   | Next.js (App Router) + TypeScript + Tailwind CSS |
| Validation | class-validator or Zod                           |

### Data Model

Four entities (matching the architecture from Part 1):

```typescript
// Facility
{
	id: string; // UUID
	name: string;
	type: 'nursing_home' | 'hospital' | 'clinic';
	is_active: boolean;
	created_at: Date;
}

// Professional
{
	id: string; // UUID
	name: string;
	qualification: 'CNA' | 'LPN' | 'RN';
	is_active: boolean;
	created_at: Date;
}

// Shift
{
	id: string; // UUID
	facility_id: string; // FK
	qualification_required: 'CNA' | 'LPN' | 'RN';
	start_time: Date;
	end_time: Date;
	pay_rate_cents: number;
	status: 'open' | 'booked' | 'completed' | 'cancelled';
	created_at: Date;
	updated_at: Date;
}

// Booking
{
	id: string; // UUID
	shift_id: string; // FK (unique)
	professional_id: string; // FK
	status: 'confirmed' | 'completed' | 'cancelled';
	booked_at: Date;
	created_at: Date;
}
```

### Seed Data

Pre-seed the database with:

- 3 facilities: "Sunrise Nursing Home" (nursing_home), "Metro General Hospital" (hospital), "Downtown Clinic" (clinic)
- 5 professionals: "Alice Johnson" (RN), "Bob Smith" (CNA), "Carol Williams" (LPN), "David Brown" (CNA), "Eva Martinez" (LPN)
- No shifts — facilities create them through the UI

### API Contract

```
POST   /api/shifts                -- Create a shift
GET    /api/shifts                -- List shifts (?status=open&qualification=CNA)
GET    /api/shifts/:id            -- Get shift with booking details
POST   /api/shifts/:id/book      -- Book a shift

GET    /api/facilities            -- List facilities
GET    /api/professionals         -- List professionals
```

**POST /api/shifts**

```json
// Request
{
  "facility_id": "uuid",
  "qualification_required": "CNA",
  "start_time": "2025-01-15T07:00:00Z",
  "end_time": "2025-01-15T15:00:00Z",
  "pay_rate_cents": 2500
}
// Response: 201
{
  "id": "uuid",
  "facility_id": "uuid",
  "facility_name": "Sunrise Nursing Home",
  "qualification_required": "CNA",
  "start_time": "2025-01-15T07:00:00Z",
  "end_time": "2025-01-15T15:00:00Z",
  "pay_rate_cents": 2500,
  "status": "open",
  "created_at": "..."
}
```

**GET /api/shifts**

```
Query params:
  status: 'open' | 'booked' | 'all' (default: 'open')
  qualification: 'CNA' | 'LPN' | 'RN' (optional filter)

Response: 200
[
  {
    "id": "uuid",
    "facility_id": "uuid",
    "facility_name": "Sunrise Nursing Home",
    "qualification_required": "CNA",
    "start_time": "...",
    "end_time": "...",
    "pay_rate_cents": 2500,
    "status": "open",
    "booking": null
  }
]
```

**POST /api/shifts/:id/book**

```json
// Request
{ "professional_id": "uuid" }

// Success: 200
{
  "id": "shift-uuid",
  "status": "booked",
  "booking": {
    "id": "booking-uuid",
    "professional_id": "uuid",
    "professional_name": "Bob Smith",
    "status": "confirmed",
    "booked_at": "..."
  }
}

// Error: 409 (already booked)
{ "statusCode": 409, "message": "Shift is already booked" }

// Error: 400 (qualification mismatch)
{ "statusCode": 400, "message": "Professional qualification 'CNA' does not match required 'RN'" }
```

### Frontend Requirements

Two views with minimal styling. Functional clarity over visual polish.

#### View 1: Facility Dashboard (`/facility`)

- Dropdown to select a facility (from seed data)
- Form to post a new shift:
  - Qualification required (dropdown: CNA, LPN, RN)
  - Date/time inputs for start and end
  - Pay rate (dollar input, convert to cents)
- List of shifts posted by the selected facility
  - Status badge (open = green, booked = blue)
  - If booked, show professional name

#### View 2: Professional Dashboard (`/professional`)

- Dropdown to select a professional (from seed data)
- List of available shifts filtered by selected professional's qualification
  - Show facility name, date/time, pay rate
  - "Book" button on each open shift
- After booking, shift moves from "Available" to a "My Shifts" section
- Show error messages inline (already booked, qualification mismatch)

#### Navigation

Simple nav bar or tabs to switch between Facility and Professional views.

### Acceptance Criteria

All 8 must work end-to-end:

1. A facility can post a shift with a required qualification and pay rate.
2. A professional sees only shifts matching their qualification.
3. A professional can book an open shift.
4. After booking, the shift status changes to "booked" and is no longer bookable.
5. The facility dashboard reflects the booking (shows booked status and professional name).
6. Booking an already-booked shift returns 409, displayed in the UI.
7. Booking with mismatched qualification returns 400, displayed in the UI.
8. All API inputs are validated (missing fields, invalid types return 400 with clear messages).

### Extra Credit

In order of impressiveness — attempt after core is complete:

1. **Concurrent booking protection**: Use `SELECT ... FOR UPDATE` to prevent race conditions. Add a comment explaining the approach.
2. **Real-time updates**: Facility dashboard updates without refresh when a shift is booked (WebSocket or SSE).
3. **Shift cancellation**: Professional can cancel a booking. Shift returns to "open".
4. **Time overlap validation**: Prevent a professional from booking overlapping shifts.
5. **Pay formatting**: Display cents as dollars ($25.00/hr). Calculate total shift pay from duration.
6. **API tests**: 3-5 integration tests for the booking flow (happy path, already booked, qualification mismatch).
7. **Docker Compose**: `docker-compose.yml` that starts PostgreSQL and the API with one command.
8. **Filtering and sorting**: Sort shifts by pay rate, date, or facility. Filter by date range.

### Time Management

| Phase         | Time      | Activities                                                     |
| ------------- | --------- | -------------------------------------------------------------- |
| Setup         | 5-8 min   | Scaffold NestJS + Next.js. Install deps. Database connection.  |
| Data model    | 5-7 min   | Define entities, sync schema, write seed script.               |
| API endpoints | 15-20 min | Implement 6 endpoints with validation. Test with curl.         |
| Frontend      | 15-20 min | Build both views. Wire API calls. Handle loading/error states. |
| Integration   | 5-10 min  | End-to-end testing. Fix edge cases. Polish error messages.     |
| Extra credit  | Remaining | Pick one stretch goal.                                         |

### Getting Started

```bash
# Backend
npx @nestjs/cli new shift-api --strict --skip-git --package-manager pnpm
cd shift-api
pnpm add @nestjs/typeorm typeorm pg class-validator class-transformer
pnpm add -D @types/node

# Frontend
npx create-next-app@latest shift-ui --typescript --tailwind --app --src-dir
```

---

## Evaluation Rubric

### Part 1: Architecture

| Score      | Description                                                                                                                                                                                                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Strong** | Data model captures all relationships correctly. Booking concurrency addressed with specific mechanism. 3+ trade-offs articulated with alternatives. Discussed failure modes unprompted. Scalability notes are specific ("add index on X", "extract search to Y"), not vague ("scale horizontally"). |
| **Solid**  | Correct data model. Reasonable service boundaries. Mentioned concurrency. At least 2 trade-offs. Some gaps but overall coherent.                                                                                                                                                                     |
| **Weak**   | Got basics right but missed booking concurrency. Vague on trade-offs. No failure mode discussion.                                                                                                                                                                                                    |
| **Miss**   | Data model doesn't enforce one-booking-per-shift. No concurrency strategy. Business logic in controllers.                                                                                                                                                                                            |

### Part 2: Implementation

| Score      | Description                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| **Strong** | All 8 acceptance criteria pass. 2+ extra credit items. Clean service layer, typed DTOs, proper error handling.      |
| **Solid**  | All 8 criteria pass. Reasonable structure. Minor rough edges (some `any` types, validation gaps). 0-1 extra credit. |
| **Weak**   | 5-6 criteria pass. Booking works but error handling incomplete. Logic in controllers. No extra credit.              |
| **Miss**   | Fewer than 5 criteria. Cannot demo the core flow. Significant errors.                                               |
