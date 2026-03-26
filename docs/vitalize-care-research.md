# Vitalize Care — Reverse-Engineered Architecture

## The Business

Vitalize Care (YC W23) is building the operating system for hospital operations, starting with nurse staffing and scheduling optimization. They automate labor management processes that currently live on paper, spreadsheets, or require departments of 20+ FTEs to manage manually.

- **Founded**: 2021 (pivoted from healthcare worker mental health platform)
- **HQ**: San Francisco, CA
- **Team**: ~23 employees
- **Founders**: Veeraj Shah (CEO, MD/PhD student, ex-Surgeon General digital health), Sanketh Andhavarapu (CPO, 20+ peer-reviewed publications), Nikhil D'Souza (CTO, ex-first engineer at Vincere Health, AI/ML at Eli Lilly, Columbia Data Science dropout)
- **Funding**: $7M seed (YC, What If Ventures, Anorak Ventures) + recently closed Series A
- **Revenue**: 8 figures ARR in 2 years with <15 person team
- **Customers**: Health systems across inpatient, ambulatory, and extended care settings

**Origin story**: Founders initially built a mental health platform for healthcare workers. Through 20+ health system interviews, they discovered the real pain point was "staffing and scheduling is the bane of my existence." They pivoted, landed a six-figure pilot with a Figma prototype (no code), and converted it into a multi-million dollar deal within four weeks. The founders moved to East Tennessee for 8 months, sleeping at hospitals to understand the problem deeply.

## Confirmed Tech Stack

| Layer              | Technology                           | Source         |
| ------------------ | ------------------------------------ | -------------- |
| **Language**       | TypeScript (monorepo)                | Job posting    |
| **Runtime**        | Bun                                  | Job posting    |
| **Core framework** | Effect (functional effect system)    | Job posting    |
| **Frontend**       | Vite + TanStack (React Query/Router) | Job posting    |
| **UI components**  | Radix UI + Tailwind CSS              | Site analysis  |
| **Mobile**         | React Native                         | Site analysis  |
| **ORM**            | Drizzle                              | Job posting    |
| **Database**       | PlanetScale (serverless MySQL)       | Job posting    |
| **Hosting**        | Vercel                               | Site analytics |
| **Marketing site** | Framer                               | Site analysis  |

## The Product

Vitalize is a unified platform for hospital labor management with four core capabilities:

### 1. Real-time Workforce Intelligence

An event-driven engine that reconciles data from multiple sources (EMR census, HR systems, payroll, time & attendance) into a single operational model. Gives managers real-time visibility into census, staffing gaps, productivity, vacancy rates, and premium labor spend — by unit, across the hospital.

### 2. Forecasting & Planning

Predictive models for patient volume and staffing demand. Proactively identifies future staffing gaps so managers can fill them before they become critical. Moves hospitals from reactive ("we're short today") to proactive ("we'll be short Thursday night on 3-North").

### 3. Optimization & Recommendations

A decision layer that produces staffing recommendations under constraints — integrating volume, acuity, cost, skills, and patient flow into every staffing decision. Replaces subjective decision-making in staffing offices with data-driven recommendations.

### 4. Autonomous Scheduling

Prompt-driven automation that replaces manual nurse scheduling workflows. Nurses interact via mobile app for self-scheduling, shift swaps, and availability management. Managers review and approve rather than build schedules from scratch.

**Key metrics**: 12%+ direct labor cost savings, 1.5 hrs/day time savings for clinical managers, 0% FTE leakage, 70% less time on manual staffing tasks.

### Integrations

- **EMR**: Epic, Oracle Health (Cerner), Meditech
- **Payroll/HR**: UKG, Symplr, Workday
- **Time & Attendance**: Interfaces with existing T&A systems
- Design principle: hospitals don't change how they work — Vitalize fits into existing systems

## Domain Primer: Hospital Staffing & Scheduling

Key concepts you need to understand for the interview:

| Concept                     | What It Means                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Census**                  | Current patient count per unit. The primary driver of staffing needs. Changes throughout the day as patients are admitted/discharged.               |
| **Acuity**                  | How sick patients are. Higher acuity = more nursing hours per patient. An ICU patient needs 1:1 or 1:2 ratios; a med-surg patient might be 1:5.     |
| **Nurse-to-patient ratios** | Legally mandated in some states (California), hospital policy in others. The core constraint that determines how many nurses you need.              |
| **Shift types**             | Day (7a-7p), Night (7p-7a), or 8-hour shifts (7a-3p, 3p-11p, 11p-7a). Typically 12h shifts in acute care.                                           |
| **Float pool**              | Nurses who can work across multiple units based on their skills. More flexible but less specialized. Key resource for filling gaps.                 |
| **Premium labor**           | Travel nurses, agency nurses, overtime. Costs 2-3x regular staff. What hospitals desperately want to minimize — this is where Vitalize saves money. |
| **FTE leakage**             | Paying for full-time equivalent positions but not utilizing them efficiently. Nurse is on payroll for 36 hrs/week but only productive for 28.       |
| **Skills/certifications**   | ICU, ER, L&D, med-surg, NICU, OR, etc. Nurses can't just work anywhere — they need specific certifications for specific units.                      |
| **Self-scheduling**         | Nurses submit shift preferences for the upcoming schedule period. Managers reconcile preferences with demand. Modern approach to reduce burnout.    |
| **Charge nurse**            | Shift leader on each unit who makes real-time staffing adjustments (calling in float pool, reassigning patients, etc.).                             |
| **Staffing office**         | Central department (sometimes 20+ FTEs) that coordinates staffing across the entire hospital. Vitalize's primary user.                              |
| **Schedule period**         | Typically 4-6 week blocks. Schedules are built weeks in advance, then adjusted daily based on actual census.                                        |

### The Staffing Problem in a Nutshell

Hospitals face a daily optimization problem: match nursing supply to patient demand across dozens of units, while respecting constraints (certifications, ratios, labor laws, nurse preferences, union rules, overtime limits) and minimizing cost (avoid premium labor). This is currently done manually by staffing offices using spreadsheets and phone calls. Vitalize automates it.

## Architecture (Reverse-Engineered)

```
┌──────────────────────────────────────────────────────────┐
│  Nurse-Facing App (React Native)                          │
│  Self-scheduling, shift swaps, availability, notifications│
└────────────┬─────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────┐
│  Manager Dashboard (Vite + TanStack + Radix UI)           │
│  Real-time census, staffing gaps, schedule management,    │
│  analytics, reporting                                     │
└────────────┬─────────────────────────────────────────────┘
             │  API (TypeScript + Effect + Bun)
┌────────────▼─────────────────────────────────────────────┐
│  Backend Services (TypeScript monorepo)                    │
│                                                            │
│  ┌─────────────────┐  ┌──────────────────────────────┐   │
│  │ Intelligence     │  │ Scheduling Engine            │   │
│  │ Engine           │  │ Constraint solver /          │   │
│  │ Event-driven,    │  │ optimization under           │   │
│  │ real-time data   │  │ constraints (skills, ratios, │   │
│  │ reconciliation   │  │ cost, preferences)           │   │
│  └─────────────────┘  └──────────────────────────────┘   │
│  ┌─────────────────┐  ┌──────────────────────────────┐   │
│  │ Forecasting /   │  │ Integration Layer            │   │
│  │ Prediction      │  │ Epic, Cerner, Meditech (EMR) │   │
│  │ ML models for   │  │ UKG, Workday, Symplr (HR)    │   │
│  │ patient volume  │  │ T&A systems                   │   │
│  └─────────────────┘  └──────────────────────────────┘   │
└────────────┬──────────────────────┬──────────────────────┘
             │                      │
        ┌────▼─────┐         ┌──────▼──────┐
        │PlanetScale│         │ External    │
        │(MySQL /   │         │ Systems     │
        │ Drizzle)  │         │ (EMR, HR,   │
        └───────────┘         │  Payroll)   │
                              └─────────────┘
```

### Architectural Notes

**TypeScript Monorepo**: Everything in one repo — API, dashboard, mobile app, shared types/utilities. Effect provides the application framework, handling dependency injection, error propagation, and concurrency.

**Event-Driven Intelligence**: The "intelligence engine" likely uses event sourcing or a streaming pattern to reconcile data from multiple external systems (EMR pushes census updates, HR system pushes schedule changes, T&A pushes clock-in/clock-out). These events are reconciled into a real-time operational model.

**Constraint Optimization**: The scheduling engine solves a constraint satisfaction problem — given demand (census + acuity forecasts), supply (available nurses + their skills), and constraints (ratios, certifications, overtime limits, preferences), produce an optimal schedule. This is likely a mix of heuristics and mathematical optimization, not pure ML.

**PlanetScale (no foreign keys)**: PlanetScale doesn't support foreign keys at the database level (Vitess limitation). This means referential integrity is enforced in application code — likely through Drizzle's schema definitions and Effect's type system. This is a deliberate trade-off for horizontal scalability.

**Integration-Heavy**: The biggest engineering challenge is likely the integration layer. Each health system runs different versions of Epic/Cerner with different configurations. Data formats vary. Sync strategies (real-time vs. polling vs. batch) depend on what each hospital's IT department allows.

## Key Technologies Deep Dive

### Effect (Effect-TS)

This is the most distinctive choice in their stack and likely relevant to the interview.

**What it is**: A functional effect system for TypeScript. Think of it as a typed, composable alternative to try/catch + Promises that tracks errors and dependencies in the type system.

**Core type**: `Effect<Success, Error, Requirements>`

- `Success` — what the effect produces on success
- `Error` — what errors it can fail with (typed, not `unknown`)
- `Requirements` — what services/dependencies it needs to run (dependency injection via the type system)

**Why they likely chose it**:

- **Typed errors**: In a healthcare system where different failure modes matter (EMR timeout vs. invalid data vs. constraint violation), knowing exactly what can fail at the type level is valuable
- **Dependency injection**: Effect's `Layer` / `Context` system replaces traditional DI containers (no NestJS-style decorators needed)
- **Structured concurrency**: Fiber-based concurrency with automatic cleanup — important for real-time data reconciliation from multiple sources
- **Resource management**: Acquire/release lifecycle guarantees — connections to EMR systems, database pools, etc. are properly managed
- **Composability**: Effects compose like Promises but with full type tracking

**Practical patterns you might see**:

```typescript
// Typed errors — the type tells you what can go wrong
const getSchedule = (unitId: string): Effect<Schedule, EMRError | NotFound, EMRService> => ...

// Dependency injection via Layers
const EMRServiceLive = Layer.succeed(EMRService, { ... })

// Structured concurrency
const reconcile = Effect.all([
  fetchCensus(unitId),
  fetchStaffing(unitId),
  fetchAcuity(unitId)
], { concurrency: "unbounded" })
```

**If you haven't used Effect before**: You can be productive with it by thinking of it as "Promises with typed errors and built-in DI." The functional programming concepts are internal — the API is practical.

### Drizzle ORM

**What it is**: A TypeScript-first SQL ORM. Unlike TypeORM (which you used in Midi), Drizzle is closer to raw SQL with type safety.

**Key differences from TypeORM**:
| TypeORM (Midi) | Drizzle (Vitalize) |
|----------------|-------------------|
| Class-based entities with decorators | Schema defined as plain objects |
| ActiveRecord or Repository pattern | SQL-like query builder |
| Heavy runtime overhead | Thin wrapper, near-zero overhead |
| Automatic migrations from entities | Schema-diff based migrations |
| Foreign key support assumed | Works with PlanetScale (no FK) |

**Drizzle schema example**:

```typescript
export const nurses = pgTable('nurses', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	unitId: integer('unit_id'), // no .references() with PlanetScale
	certifications: json('certifications').$type<string[]>(),
});
```

### PlanetScale

**What it is**: Serverless MySQL built on Vitess (the system YouTube built to shard MySQL).

**Key characteristics**:

- **No foreign keys** — Vitess doesn't support them. Referential integrity is enforced in app code.
- **Branching** — Schema changes happen on branches (like git). You create a deploy request, review the diff, merge.
- **Serverless connections** — No connection pool management. Scales to zero and up automatically.
- **Horizontal scaling** — Built for sharding. Relevant when you have data partitioned by hospital/health system.

**Why this matters for the interview**: If they ask about data integrity, the answer is "application-level enforcement + Effect's type system" rather than "database foreign keys."

### Bun

**What it is**: A fast JavaScript/TypeScript runtime that replaces Node.js.

**Key advantages**:

- Native TypeScript execution (no tsc/esbuild transpilation step)
- 3-4x faster startup than Node.js
- Built-in test runner, bundler, package manager
- Drop-in Node.js compatibility for most packages

## What to Expect in the Coding Challenge

Based on their stack, product, and job description, likely areas:

### 1. TypeScript + Effect Patterns

They're an Effect shop. They may:

- Give you a problem and ask you to model errors in the type system
- Ask you to compose services with dependency injection
- Test your comfort with typed functional patterns (pipe, map, flatMap)
- Or they may just want clean TypeScript and see if you can learn Effect

### 2. Scheduling / Optimization Algorithm

Their core product is a constraint solver. Possible challenges:

- "Given N nurses with skills and M units with requirements, produce an optimal assignment"
- "Handle shift swap requests while maintaining coverage constraints"
- "Optimize a schedule to minimize premium labor spend"
- These map to constraint satisfaction problems (CSP), assignment problems, or greedy/heuristic optimization

### 3. Real-time Data Reconciliation

Their intelligence engine reconciles data from multiple systems:

- "Multiple data sources report conflicting information — how do you reconcile?"
- Event-driven architecture, CQRS, or stream processing patterns
- Handling eventually consistent data from external systems

### 4. Full-Stack Feature Build

The job posting emphasizes end-to-end ownership:

- Build a feature from DB schema (Drizzle) through API (Effect) to UI (TanStack/Radix)
- Could be a staffing dashboard, schedule view, or notification system

### 5. Integration Design

How would you build a connector to Epic/Cerner?

- HL7v2 messages, FHIR APIs, or proprietary APIs
- Handling different hospital configurations
- Sync strategies, error handling, data transformation

### 6. Healthcare Domain Modeling

Similar to what you built for Midi:

- Model nurses, units, shifts, skills, coverage requirements
- Handle constraints (ratios, certifications, overtime rules)
- Design for multi-tenant (each hospital is a tenant)

## Key Interview Topics to Prepare

1. **Constraint satisfaction / optimization** — Know the basics: greedy algorithms, assignment problems, how to model constraints. You don't need OR/LP solvers, but understand the shape of the problem.

2. **Event-driven architecture** — How to reconcile data from multiple sources in real-time. Event sourcing, CQRS, conflict resolution strategies.

3. **Effect patterns** — At minimum, understand the `Effect<A, E, R>` type signature, how Layers work for DI, and how to compose effects. Read https://effect.website/ getting started guide.

4. **Multi-tenant data modeling** — Each hospital is a tenant. How do you partition data, handle different configurations, and ensure isolation?

5. **Integration patterns** — How to build reliable connectors to external systems (EMR, HR). Retry strategies, circuit breakers, data transformation, handling downtime.

6. **Full-stack TypeScript** — Vite + TanStack for frontend, Effect + Drizzle for backend, shared types across the monorepo.

7. **Healthcare compliance basics** — HIPAA (PHI handling, audit logs, access controls), though they're a staffing tool so PHI exposure is lower than Midi's clinical data.

8. **Early-stage engineering judgment** — They're 23 people. Show you can make pragmatic trade-offs, ship fast, and take ownership of ambiguous problems.

## Comparison: Vitalize vs. Midi (What You Already Know)

| Aspect              | Midi Health                                              | Vitalize Care                                            |
| ------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| **Domain**          | Virtual menopause care (clinical)                        | Hospital staffing optimization (operational)             |
| **Stack**           | Django/DRF + React/Next.js                               | TypeScript monorepo + Effect + Bun                       |
| **Database**        | PostgreSQL                                               | PlanetScale (MySQL)                                      |
| **ORM**             | Django ORM                                               | Drizzle                                                  |
| **Core challenge**  | Eligibility RAG + clinician matching                     | Staffing optimization + data reconciliation              |
| **Integration**     | AthenaOne EHR                                            | Epic, Cerner, UKG, Workday                               |
| **Team size**       | Larger (230K patients, Series C)                         | Smaller (~23 people, Series A)                           |
| **Interview style** | Architecture design exercise                             | Coding challenge (staff level)                           |
| **Overlap**         | Scheduling, healthcare domain, constraint-based matching | Similar optimization/matching patterns, different domain |

Your Midi work is directly transferable: clinician matching is essentially the same class of problem as nurse-to-unit assignment, and your appointment scheduling concurrency patterns apply to shift booking.

## Sources

- [Vitalize Care](https://vitalize.care/)
- [Vitalize — Y Combinator](https://www.ycombinator.com/companies/vitalize)
- [Full-Stack Engineer Job Posting — Ashby](https://jobs.ashbyhq.com/vitalize/d907ba5f-0f2f-4bb4-931a-1680d6daf81a)
- [Vitalize HN Hiring Post](https://news.ycombinator.com/item?id=46880747)
- [Millions in revenue with a <15 person team — Next Play](https://nextplayso.substack.com/p/millions-in-revenue-with-a-15-person)
- [Vitalize Care — AVIA Marketplace](https://marketplace.aviahealth.com/product/84264)
- [Vitalize Care — Paraform](https://www.paraform.com/company/vitalize-care)
- [Nikhil D'Souza (CTO)](https://nikhil.ai/)
- [Vitalize Care — Crunchbase](https://www.crunchbase.com/organization/vitalize-care)
- [Vitalize Care — Wellfound](https://wellfound.com/company/vitalize-care)
- [Effect — TypeScript Library](https://effect.website/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [PlanetScale](https://planetscale.com/)
