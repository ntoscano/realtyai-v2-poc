# Red Planet Staffing — Architecture Overview

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MONOREPO                                    │
│                                                                     │
│  ┌──────────────────────┐         ┌──────────────────────────────┐  │
│  │   CLIENT (React)     │         │   SERVER (NestJS)            │  │
│  │   Vite :5000         │         │   Express :3000              │  │
│  │                      │  proxy  │                              │  │
│  │  Browser ─── Axios ──┼────────>│  Controllers                 │  │
│  │                      │ /api/*  │       │                      │  │
│  │  TanStack Query      │  ──>    │  Services                    │  │
│  │  MUI 5               │  /*     │       │                      │  │
│  │                      │         │  Prisma ORM                  │  │
│  └──────────────────────┘         │       │                      │  │
│                                   │  ┌────▼─────┐                │  │
│  ┌──────────────────────┐         │  │  SQLite   │                │  │
│  │   SCRIPTS            │  HTTP   │  │  dev.db   │                │  │
│  │   ts-node            ├────────>│  └──────────┘                │  │
│  │                      │  :3000  │                              │  │
│  │  top-workplaces.ts   │         │                              │  │
│  │  top-workers.ts      │         │                              │  │
│  └──────────────────────┘         └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**Key detail:** Vite rewrites `/api/shifts` → `http://localhost:3000/shifts` (strips `/api` prefix). Scripts call the server directly at `:3000`.

---

## 2. NestJS Module Dependency Graph

```
┌─────────────────────────────────────────────────────┐
│                  AppModule (@Global)                  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │          PrismaModule (@Global)                │  │
│  │                                                │  │
│  │  PrismaService extends PrismaClient            │  │
│  │  implements OnModuleInit                        │  │
│  │  (exported — available to all modules)          │  │
│  └──────────────────┬─────────────────────────────┘  │
│                     │                                 │
│         ┌───────────┼───────────┐                     │
│         ▼           ▼           ▼                     │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │
│  │ShiftsModule│ │WorkersModule│ │WorkplacesModule  │  │
│  │            │ │            │ │                  │  │
│  │ Controller │ │ Controller │ │ Controller       │  │
│  │ Service ◄──┤ │ Service ◄──┤ │ Service ◄────────┤  │
│  │ Mapper    │ │ Mapper    │ │ Mapper           │  │
│  │ Schemas   │ │ Schemas   │ │ Schemas          │  │
│  └────────────┘ └────────────┘ └──────────────────┘  │
│                                                      │
│  Shared: pagination.ts, constants.ts, shared.types   │
│  Pipes:  ZodValidationPipe                           │
└──────────────────────────────────────────────────────┘

◄── = PrismaService injected via constructor
```

Each domain module follows the same pattern:

- **Controller** — route handling, validation pipes, response shaping
- **Service** — business logic, Prisma queries
- **Mapper** — entity → DTO (omits `shard`, serializes dates)
- **Schemas** — Zod validation + TypeScript types

---

## 3. Request Processing Pipeline

Example: `GET /shifts?page=0&workerId=3`

```
  HTTP Request
       │
       ▼
┌──────────────────────────────────┐
│  ShiftsController.get()          │  shifts.controller.ts:64
│  @Get() @UsePipes(ZodValidation) │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  ZodValidationPipe               │  zod-validation-pipe.ts
│  Parses query with               │
│  getShiftsQuerySchema            │  shifts.schemas.ts:18
│  → { page: 0, workerId: 3 }     │
│  Throws BadRequestException      │
│  on invalid input                │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  getPage(0, undefined)           │  pagination.ts:27
│  → { num: 0, size: 10, shard: 0}│
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  ShiftsService.get()             │  shifts.service.ts:23
│                                  │
│  buildWhereFilter({ workerId:3 })│  shifts.service.ts:66
│  → { workerId: 3 }              │
│                                  │
│  queryParameters({ page, where })│  pagination.ts:51
│  → { skip:0, take:10,           │
│      where:{ shard:0,            │
│              workerId:3 }}       │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  prisma.shift.findMany({         │
│    skip: 0, take: 10,            │
│    where: { shard:0, workerId:3},│
│    orderBy: { id: 'asc' }       │
│  })                              │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  getNextPage()                   │  pagination.ts:75
│  Checks if page 1 in shard 0    │
│  has results. If not, checks     │
│  shard 1. Returns Page or undef. │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  toShiftDTO(shift)               │  shifts.mapper.ts:6
│  1. omitShard() — removes shard  │
│  2. Dates → .toISOString()       │
│  3. cancelledAt → string | null  │
└──────┬───────────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  nextLink({ nextPage, request }) │  pagination.ts:35
│  Builds URL with updated         │
│  ?page=N&shard=M params          │
└──────┬───────────────────────────┘
       │
       ▼
  Response:
  {
    "data": [ ...ShiftDTOs ],
    "links": {
      "next": "http://localhost:3000/shifts?page=1&shard=0&workerId=3"
    }
  }
```

---

## 4. Database Entity Relationships

```
┌───────────────────────┐       ┌───────────────────────────────────┐
│       Worker           │       │              Shift                 │
├───────────────────────┤       ├───────────────────────────────────┤
│ id        INT PK      │       │ id           INT PK               │
│ name      STRING      │       │ createdAt    DATETIME (auto)      │
│ status    INT         │◄──┐   │ startAt      DATETIME             │
│   0 = ACTIVE          │   │   │ endAt        DATETIME             │
│   1 = SUSPENDED       │   │   │ jobType      STRING               │
│   2 = CLOSED          │   │   │ cancelledAt  DATETIME?            │
│ shard     INT (0-10)  │   │   │ shard        INT (0-10)           │
└───────────────────────┘   │   │                                   │
                            └───┤ workerId     INT? FK ─────────┐   │
                                │ workplaceId  INT  FK ──────┐  │   │
                                └────────────────────────────┼──┼───┘
                                                             │  │
┌───────────────────────┐                                    │  │
│      Workplace         │                                    │  │
├───────────────────────┤                                    │  │
│ id        INT PK      │◄───────────────────────────────────┘  │
│ name      STRING      │                                       │
│ status    INT         │   ┌───────────────────────────────────┘
│   0 = ACTIVE          │   │
│   1 = SUSPENDED       │   │  Relationships:
│   2 = CLOSED          │   │  • Workplace 1 ──< many Shifts
│ location  STRING      │   │  • Worker    1 ──< many Shifts (nullable)
│ shard     INT (0-10)  │   │  • workerId NULL = unclaimed shift
└───────────────────────┘   │
                            │
    A Shift always belongs to a Workplace.
    A Shift optionally belongs to a Worker (claimed vs unclaimed).
```

---

## 5. Shift Lifecycle

```
                    POST /shifts
                        │
                        ▼
              ┌───────────────────┐
              │      OPEN         │
              │                   │
              │  workerId = null  │
              │  cancelledAt=null │
              └────────┬──────────┘
                       │
                       │  POST /shifts/:id/claim
                       │  body: { workerId: N }
                       │
                       │  Guard: workerId must be null
                       │  Sets: workerId = N
                       ▼
              ┌───────────────────┐
              │     CLAIMED       │
              │                   │
              │  workerId = N     │
              │  cancelledAt=null │
              └────────┬──────────┘
                       │
              ┌────────┴────────────────────────┐
              │                                 │
              │  POST /shifts/:id/cancel        │  (shift time passes)
              │                                 │
              │  Guard: workerId must not       │
              │         be null                 ▼
              │  Sets: workerId = null  ┌───────────────────┐
              │        cancelledAt=now  │    COMPLETED       │
              ▼                        │                   │
     ┌───────────────────┐             │  workerId = N     │
     │    CANCELLED       │             │  cancelledAt=null │
     │                   │             │  endAt < now      │
     │  workerId = null  │             └───────────────────┘
     │  cancelledAt = ts │
     └───────────────────┘

  Note: "COMPLETED" is not an explicit DB state — it's derived:
        workerId != null AND cancelledAt == null AND endAt < now
```

---

## 6. Pagination + Shard Flow

```
  Client requests: GET /shifts?page=0&shard=0
                        │
                        ▼
                ┌───────────────┐
                │   getPage()   │
                │ num=0, size=10│
                │ shard=0       │
                └───────┬───────┘
                        │
                        ▼
              ┌───────────────────┐
              │ queryParameters() │
              │ skip = 0 * 10 = 0 │
              │ take = 10         │
              │ where.shard = 0   │
              └───────┬───────────┘
                      │
                      ▼
              ┌───────────────────┐
              │ prisma.findMany() │──────► Returns up to 10 items
              └───────┬───────────┘
                      │
                      ▼
              ┌───────────────────┐
              │  getNextPage()    │
              └───────┬───────────┘
                      │
                      ▼
              ┌───────────────────────┐
              │ Count items at        │
              │ page=1, shard=0       │
              └───────┬───────────────┘
                      │
              ┌───────┴───────┐
              │               │
          count > 0       count = 0
              │               │
              ▼               ▼
      Return page 1    ┌─────────────────┐
      shard 0          │ nextShard = 1    │
                       │ Count at page=0  │
                       │ shard=1          │
                       └───────┬──────────┘
                               │
                       ┌───────┴───────┐
                       │               │
                   count > 0       count = 0
                       │               │
                       ▼               ▼
               Return page 0     Return undefined
               shard 1           (no more data)
                                 links.next = null

  ⚠ BUG (unfixed): Only checks shard N+1.
  If shard 1 is empty but shard 2 has data, pagination stops.
  Fix: loop through all remaining shards.
```

---

## 7. Client Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  App.tsx                                                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  QueryClientProvider                                       │  │
│  │  ┌──────────────────────────────────────────────────────┐  │  │
│  │  │  ShiftDashboard                                      │  │  │
│  │  │                                                      │  │  │
│  │  │  ┌────────────────────┐  ┌────────────────────────┐  │  │  │
│  │  │  │  AvailableShifts   │  │  BookedShifts           │  │  │  │
│  │  │  │                    │  │                        │  │  │  │
│  │  │  │  useQuery(         │  │  useQuery(             │  │  │  │
│  │  │  │   "available-      │  │   "booked-shifts")     │  │  │  │
│  │  │  │    shifts")        │  │        │               │  │  │  │
│  │  │  │       │            │  │        ▼               │  │  │  │
│  │  │  │       ▼            │  │  GET /api/shifts       │  │  │  │
│  │  │  │  GET /api/shifts   │  │        │               │  │  │  │
│  │  │  │       │            │  │        ▼               │  │  │  │
│  │  │  │       ▼            │  │  Filter: workerId      │  │  │  │
│  │  │  │  Filter: !workerId │  │  IS NOT null           │  │  │  │
│  │  │  │       │            │  │        │               │  │  │  │
│  │  │  │       ▼            │  │        ▼               │  │  │  │
│  │  │  │  ShiftCard[]       │  │  ShiftCard[]           │  │  │  │
│  │  │  │  [Claim Shift]─────┼──┼──┐ [Cancel Shift]──┐  │  │  │  │
│  │  │  └────────────────────┘  └──┼─────────────────┼──┘  │  │  │
│  │  │                             │                 │      │  │  │
│  │  └─────────────────────────────┼─────────────────┼──────┘  │  │
│  └────────────────────────────────┼─────────────────┼─────────┘  │
└───────────────────────────────────┼─────────────────┼────────────┘
                                    │                 │
                                    ▼                 ▼
                          POST /api/shifts/    POST /api/shifts/
                          {id}/claim           {id}/cancel
                                    │                 │
                                    └────────┬────────┘
                                             │
                                             ▼
                                   invalidateQueries(
                                     "available-shifts",
                                     "booked-shifts"
                                   )

  ⚠ Note: Both queries fetch ALL shifts and filter client-side.
  At scale, use server-side filtering: ?workerId=N or ?workerId=null
```

---

## 8. Script Data Flow (Top Workplaces / Top Workers)

```
  ┌──────────────────────────────────────────────────────────┐
  │  top-workplaces.ts (top-workers.ts is identical pattern) │
  └──────────┬───────────────────────────────────────────────┘
             │
             ├──► fetchAllPages("/workplaces")
             │         │
             │         │  GET /workplaces ──► page 0
             │         │  GET /workplaces?page=1 ──► page 1
             │         │  ... follow links.next until undefined
             │         │
             │         ▼
             │    All workplaces [ {id, name, status}, ... ]
             │         │
             │         ▼
             │    Filter: status === 0 (ACTIVE only)
             │    Build: activeWorkplaceIds Set
             │    Build: workplaceMap (id → workplace)
             │
             ├──► fetchCompletedShifts()
             │         │
             │         │  fetchAllPages("/shifts")
             │         │  (same pagination loop)
             │         │
             │         ▼
             │    All shifts
             │         │
             │         ▼
             │    Filter: workerId != null
             │            AND cancelledAt == null
             │
             ▼
  ┌──────────────────────────────────────┐
  │  Count completed shifts per          │
  │  active workplaceId                  │
  │                                      │
  │  Map<workplaceId, count>             │
  │  (skip shifts for inactive           │
  │   workplaces)                        │
  └──────────┬───────────────────────────┘
             │
             ▼
  ┌──────────────────────────────────────┐
  │  Sort by count DESC                  │
  │  Take top 3                          │
  │  Map to { name, shifts }             │
  └──────────┬───────────────────────────┘
             │
             ▼
  console.log(JSON.stringify(top3))

  Output:
  [
    { "name": "Radiant Power Inc", "shifts": 3 },
    { "name": "Sun Phosphate Software", "shifts": 3 },
    { "name": "Saturn Systems", "shifts": 3 }
  ]
```

---

## 9. Production / At-Scale Considerations

### Current Architecture Limitations

```
  Current:                          At Clipboard Scale:

  SQLite (single file)              Millions of shifts
  30 shifts in seed data            Thousands of facilities
  21 workers                        Tens of thousands of workers
  All data in shard 0               Data across 10+ shards
  No caching                        High read volume
  No auth                           Multi-tenant
  Offset pagination (skip/take)     Deep pages = slow queries
  In-memory filtering               Can't load all shifts in RAM
```

### What a Production Architecture Looks Like

```
┌─────────────┐     ┌──────────┐     ┌──────────────────────┐
│   CDN /      │     │  Load    │     │   NestJS Cluster     │
│   Static     │────▶│ Balancer │────▶│   (multiple pods)    │
│   Assets     │     └──────────┘     │                      │
└─────────────┘                       │  ┌───────────────┐   │
                                      │  │ Auth Middleware│   │
                                      │  └───────┬───────┘   │
                                      │          │           │
                                      │  ┌───────▼───────┐   │
                                      │  │  Rate Limiter  │   │
                                      │  └───────┬───────┘   │
                                      │          │           │
                                      └──────────┼───────────┘
                                                 │
                              ┌──────────────────┼──────────────────┐
                              │                  │                  │
                              ▼                  ▼                  ▼
                      ┌──────────────┐   ┌─────────────┐   ┌─────────────┐
                      │  PostgreSQL   │   │   Redis      │   │  Analytics  │
                      │  (primary)    │   │   Cache      │   │  Pipeline   │
                      │              │   │              │   │             │
                      │  Workers     │   │  Session     │   │  Kafka/SQS  │
                      │  Workplaces  │   │  Hot queries │   │      │      │
                      │  Shifts      │   │  Rate limits │   │      ▼      │
                      │              │   └─────────────┘   │  Data Lake  │
                      │  ┌────────┐  │                     │  (analytics │
                      │  │Read    │  │                     │   queries)  │
                      │  │Replicas│  │                     └─────────────┘
                      │  └────────┘  │
                      └──────────────┘
```

### Key Changes at Scale

| Concern            | Current                                    | Production                                                       |
| ------------------ | ------------------------------------------ | ---------------------------------------------------------------- |
| **Database**       | SQLite (single file)                       | PostgreSQL or MongoDB with read replicas                         |
| **Pagination**     | Offset (`skip/take`) — O(N) for deep pages | Cursor-based (`WHERE id > X LIMIT N`) — O(1)                     |
| **Filtering**      | Client-side (fetch all, filter in JS)      | Server-side (`?status=0`, indexed columns)                       |
| **Analytics**      | Script loads all data into memory          | SQL aggregation, materialized views, or dedicated pipeline       |
| **Sharding**       | Logical field on each row                  | Physical: separate DB instances per shard, routing layer         |
| **Caching**        | None                                       | Redis for hot queries (shift lists, workplace details)           |
| **Auth**           | None                                       | JWT/session middleware, role-based access                        |
| **Error handling** | Raw `throw new Error()`                    | NestJS `HttpException` subclasses (`NotFoundException`, etc.)    |
| **Observability**  | None                                       | Structured logging, APM (Datadog/New Relic), distributed tracing |

### Shard System at Scale

```
  Current (logical sharding):

  ┌─────────────────────────────────────┐
  │          Single SQLite DB           │
  │                                     │
  │  Worker { id:1, shard:0 }           │
  │  Worker { id:2, shard:0 }           │
  │  ...all shard=0...                  │
  └─────────────────────────────────────┘

  Production (physical sharding):

  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  Shard 0 DB  │  │  Shard 1 DB  │  │  Shard 2 DB  │  ...
  │  PostgreSQL  │  │  PostgreSQL  │  │  PostgreSQL  │
  │              │  │              │  │              │
  │  Workers     │  │  Workers     │  │  Workers     │
  │  Shifts      │  │  Shifts      │  │  Shifts      │
  │  Workplaces  │  │  Workplaces  │  │  Workplaces  │
  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
         │                 │                 │
         └─────────┬───────┘                 │
                   │                         │
            ┌──────▼─────────────────────────▼──┐
            │         Shard Router              │
            │  Determines target shard from     │
            │  entity ID or routing key         │
            │                                   │
            │  Cross-shard queries require       │
            │  scatter-gather (fan out to all    │
            │  shards, merge results)            │
            └───────────────────────────────────┘

  The scripts' "fetchAllPages across shards" is essentially
  a scatter-gather — it queries each shard sequentially via
  the pagination system's shard traversal.
```

### Analytics at Scale

```
  Current (our scripts):

  Script ──► GET /shifts (all pages) ──► filter in memory ──► count ──► top 3
                    │
                    └── O(total shifts) memory, O(total shifts / 10) HTTP calls


  Production approach 1 — Server-side SQL aggregation:

  GET /analytics/top-workplaces
       │
       ▼
  SELECT w.name, COUNT(s.id) as shifts
  FROM Shift s
  JOIN Workplace w ON s.workplaceId = w.id
  WHERE w.status = 0
    AND s.workerId IS NOT NULL
    AND s.cancelledAt IS NULL
  GROUP BY s.workplaceId
  ORDER BY shifts DESC
  LIMIT 3

  O(1) memory on client, single DB query, add index on (workplaceId, workerId, cancelledAt)


  Production approach 2 — Pre-computed analytics:

  ┌──────────┐    Event     ┌───────────┐    Scheduled    ┌──────────────┐
  │  Shift   │──────────────▶│  Kafka /  │────────────────▶│  Analytics   │
  │  claimed │  "shift.      │  SQS      │   or event-    │  Table       │
  │  /cancel │   claimed"    └───────────┘   driven        │              │
  └──────────┘                                             │  workplace_id│
                                                           │  shift_count │
                                                           │  last_updated│
                                                           └──────────────┘
                                                                  │
                                                                  ▼
                                                           SELECT * FROM
                                                           analytics
                                                           ORDER BY shift_count DESC
                                                           LIMIT 3
                                                           (sub-millisecond)
```

---

## 10. Shard Router — From Logical to Physical Sharding

### Current state (logical sharding)

Every entity (Worker, Workplace, Shift) has a `shard` field that defaults to `0`. There are 11 possible shards (0–10), but all seed data sits in shard 0. It's just a column in one SQLite file — not real partitioning. The pagination system uses it: when you exhaust all pages in shard 0, `getNextPage` checks shard 1, then 2, etc.

### Choosing a shard key

For a staffing marketplace, **geography** is the natural shard key:

- Shifts are local — a nurse in Phoenix doesn't care about shifts in Boston
- Workplaces are fixed to a location
- Workers typically work within a metro area

In this codebase's terms, the `location` field on `Workplace` (e.g., "Tharsis", "Elysium Planitia", "Olympus Mons") maps to shards — all workplaces in Tharsis go to shard 0, Elysium to shard 1, etc.

### What a shard router looks like

The router sits between the NestJS service layer and the database. It answers one question: **"Which database do I send this query to?"**

```
  Request: GET /shifts?location=Tharsis
                │
                ▼
       ┌─────────────────┐
       │   Shard Router   │
       │                  │
       │  Input: location │
       │  Lookup: region  │
       │  → shard 0       │
       └────────┬─────────┘
                │
                ▼
        ┌──────────────┐
        │  Shard 0 DB  │   (only Tharsis data)
        │  PostgreSQL  │
        └──────────────┘
```

Instead of one `PrismaService` connecting to one SQLite file, a `ShardRouter` holds multiple Prisma clients:

```typescript
class ShardRouter {
	private clients: Map<number, PrismaClient>; // shard number → DB connection

	getClient(shardKey: string): PrismaClient {
		const shard = this.hash(shardKey); // "Tharsis" → 0
		return this.clients.get(shard);
	}

	// Consistent hashing or a lookup table
	private hash(location: string): number {
		return this.regionMap.get(location); // "Tharsis" → 0, "Elysium" → 1
	}
}
```

### How it connects to the existing request flow

```
  Current:
  Controller → Service → PrismaService → SQLite (one DB)

  With shard router:
  Controller → Service → ShardRouter → PrismaClient[N] → PostgreSQL shard N
```

The service layer barely changes. Instead of `this.prisma.shift.findMany(...)`, it becomes `this.shardRouter.getClient(location).shift.findMany(...)`. The query is the same — it just goes to a different database.

### Cross-shard queries (scatter-gather)

Most queries are single-shard: "show me shifts in Tharsis" hits one database. But analytics like "top 3 workplaces globally" need all shards:

```
  "Top 3 workplaces globally"
           │
           ▼
    Fan out to ALL shards in parallel:
      Shard 0: SELECT workplaceId, COUNT(*) ... (Tharsis)
      Shard 1: SELECT workplaceId, COUNT(*) ... (Elysium)
      Shard 2: SELECT workplaceId, COUNT(*) ... (Olympus)
           │
           ▼
    Merge results, re-sort, take top 3
```

The scripts' `fetchAllPages` already does this — it walks through shards sequentially via pagination. At scale, you'd do it in parallel and merge.

### Key tradeoffs

| Concern                      | Detail                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Locality wins**            | ~95% of queries (browsing shifts, claiming, cancelling) are single-shard — fast                                                      |
| **Cross-shard is expensive** | Analytics/reporting should use a separate read replica or pipeline, not scatter-gather on primaries                                  |
| **Rebalancing is hard**      | If one region grows 10x, you need to split that shard — migrating data while the system is live                                      |
| **Consistent hashing**       | Simple modulo (`hash(location) % numShards`) breaks when adding shards. Consistent hashing minimizes data movement during resharding |
