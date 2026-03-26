---
name: tech-challenge
description: 'Generate a realistic architecture challenge and answer key based on company research. Produces a tech challenge doc with scenarios, requirements, and production-reviewed answer keys. Triggers on: generate challenge, create tech challenge, architecture exercise, mock interview, practice challenge.'
---

# Tech Challenge Generator

Generate realistic architecture challenges grounded in a company's domain, with production-reviewed answer keys.

---

## The Job

1. Read the company's research docs (`docs/<company>/research.md`, `tech-stack.md`)
2. Identify 1-2 core product problems that make good architecture exercises
3. Generate the challenge doc with answer keys
4. Review answer keys for production readiness before saving
5. Save to `docs/<company>/tech-challenge.md`

**Important:** Do NOT start implementing or creating PRDs. Just generate the challenge.

---

## Step 1: Analyze the Company

Read the research docs and identify:

- What are the company's 2-3 core product features?
- What domain-specific technical challenges do they face? (e.g., concurrent booking, RAG pipelines, real-time matching)
- What stack do they use? Will we need a concept mapping table?

---

## Step 2: Generate the Challenge

Follow the structure of [`docs/the-telehealth-platform/tech-challenge.md`](../../docs/the-telehealth-platform/tech-challenge.md):

### Header

- Title: `<Company> — <Role Level> Architecture Challenge`
- Summary: What the exercises cover and time expectations
- Note about stack translation if applicable

### Stack Concept Map (if needed)

If the company uses a different stack (Django, Rails, Go, etc.), provide a mapping table:

| Their Stack       | Our Stack (NestJS/TypeScript) | Key Differences |
| ----------------- | ----------------------------- | --------------- |
| Django ORM models | TypeORM entities              | ...             |
| DRF serializers   | DTOs + class-validator        | ...             |
| ViewSets + Router | Controller + Service          | ...             |

Include an "Interview tip" about translating terminology.

### Exercise 1 (45 minutes)

1. **Scenario** — Grounded in the company's actual product domain
2. **Requirements:**
   - Functional: What the system must do (numbered list)
   - Non-functional: Scale, latency, availability expectations
3. **Constraints** — Time box, what's in/out of scope
4. **Hints** — What areas to focus the deep dive on

### Exercise 2 (45 minutes)

Same structure, different product area.

---

## Step 3: Generate Answer Keys

Each exercise gets a comprehensive answer key covering:

### Data Model

- Entity definitions with TypeORM decorators
- Relationships (OneToMany, ManyToOne, ManyToMany)
- Column types, defaults, constraints
- ER diagram (ASCII)

### API Design

- Endpoints (method, path, description)
- Request/response DTOs with field types
- HTTP status codes for success AND error cases
- Authentication/authorization requirements

### Architecture Diagram

ASCII diagram showing:

- Request flow from client → controller → service → repository → database
- External integrations (queues, caches, third-party APIs)
- Data flow for the core use case

### Implementation Patterns

- Concurrency handling (pessimistic locking, optimistic locking, idempotency)
- Caching strategy (if applicable)
- Queue/async processing (if applicable)
- Error handling and retry logic

### Production Considerations

- Input validation (what, where, how)
- Security (auth, authz, data access boundaries)
- Scale analysis: what's the bottleneck at 10x, 100x, 1000x?
- Monitoring and observability hooks
- Graceful degradation and failure modes

### Trade-offs

- Alternatives considered and why they were rejected
- What would you change with more time?
- What would you change at 10x scale?

---

## Step 4: Review Pass

Before saving, review each answer key against these criteria:

### Production Readiness

- [ ] All user inputs validated server-side
- [ ] Proper HTTP status codes (400, 401, 403, 404, 409, 500)
- [ ] Error messages are helpful but don't leak internals

### Security

- [ ] Authentication required for protected endpoints
- [ ] Authorization checked (not just authentication)
- [ ] No SQL injection, XSS, or IDOR vulnerabilities
- [ ] Sensitive data not exposed in API responses

### Concurrency

- [ ] Shared mutable state identified
- [ ] Locking strategy specified (pessimistic/optimistic)
- [ ] Race conditions addressed (double-booking, double-submit)

### Scale

- [ ] Bottleneck identified and discussed
- [ ] Database query performance considered (indexes, N+1)
- [ ] Caching strategy where appropriate

If any criteria fail, fix the answer key before saving.

---

## Output

- **Format:** Markdown (`.md`)
- **Location:** `docs/<company-slug>/tech-challenge.md`

---

## Checklist Before Saving

- [ ] Exercises grounded in company's actual product domain
- [ ] Stack concept map included (if company uses different stack)
- [ ] Answer keys include data model, API, architecture, and production considerations
- [ ] Review pass completed — all criteria checked
- [ ] Trade-offs section explains alternatives considered
- [ ] Scale analysis included for each exercise
