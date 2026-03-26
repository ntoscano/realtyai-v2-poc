# Staff-Level Architecture Interview Guide

A structured mental toolkit for walking through any architecture challenge in 45-60 minutes. Not about memorizing system designs — it's about having a repeatable process that demonstrates depth, decisiveness, and operational maturity.

---

## 1. The 45-Minute Framework

| Minutes   | Phase            | Goal                                                      |
| --------- | ---------------- | --------------------------------------------------------- |
| **0-7**   | Clarify & Scope  | Understand what you're building and for whom              |
| **7-12**  | Estimate         | Back-of-envelope numbers to ground the design             |
| **12-30** | Design           | User flow → data flow → system diagram → API → data model |
| **30-40** | Deep Dive        | 1-2 critical components where the real engineering lives  |
| **40-45** | Trade-offs & Ops | Alternatives considered, operational readiness, scaling   |

The clock is your friend. Explicitly manage it: "I've spent 7 minutes on requirements — let me move to estimation, and we can revisit if needed."

---

## 2. Phase-by-Phase Playbook

### Phase 1: Clarify (Minutes 0-7)

**Never skip this.** Jumping to solutions without clarifying requirements is the single biggest red flag.

#### Functional Requirements

- What are the core user actions? (submit, search, book, cancel)
- Who are the users? (patients, clinicians, admins)
- What are the key user flows? (happy path + error paths)

#### Non-Functional Requirements

- **Scale**: How many users? DAU? Requests per second?
- **Latency**: What's acceptable? Real-time? Near-real-time? Async is fine?
- **Availability**: 99.9%? 99.99%? What's the cost of downtime?
- **Consistency**: Strong? Eventual? Where does it matter?
- **Durability**: Can we lose data? Ever?

#### Constraints

- Existing systems to integrate with? (EHR, payment processor, etc.)
- Compliance requirements? (HIPAA, PCI-DSS, GDPR)
- Team size and expertise? (affects build vs. buy decisions)
- Budget? (affects cloud architecture decisions)

#### Scoping — Say It Out Loud

"I'll design the core matching and booking system in depth. I'll sketch the notification system at a high level and hand-wave auth since it's a solved problem. Sound good?"

#### Staff Signal: Question the Problem

Don't just accept requirements — probe them.

- "Do we actually need real-time matching, or is a 2-second response acceptable?"
- "You said 99.99% availability — is that for the booking flow or the entire platform?"
- "Are we expecting 1,000 clinicians or 50,000? That changes the indexing strategy."

---

### Phase 2: Estimate (Minutes 7-12)

#### When to Do This

Do it when scale matters to the design. Skip it if the interviewer waves you forward or the problem is clearly small-scale.

#### Formula Patterns

```
QPS = (Daily Active Users × Actions per User) / 86,400
Storage = Objects per Day × Avg Object Size × Retention Days
Bandwidth = Avg Request Size × QPS
```

#### Benchmarks Worth Memorizing

| What                                 | Latency    |
| ------------------------------------ | ---------- |
| L1 cache reference                   | ~1 ns      |
| Memory reference                     | ~100 ns    |
| SSD random read                      | ~150 μs    |
| Network round trip (same datacenter) | ~0.5 ms    |
| Disk seek                            | ~10 ms     |
| Network round trip (cross-country)   | ~30-100 ms |

| What              | Size                       |
| ----------------- | -------------------------- |
| 1 million seconds | ~11.5 days                 |
| 1 billion seconds | ~31.7 years                |
| 1 KB              | A short email              |
| 1 MB              | A high-res photo           |
| 1 GB              | ~1,000 high-res photos     |
| 1 TB              | ~1 million high-res photos |

#### Example Estimation

"Midi has 230K patients. Assume 10% are active monthly, 1% daily = 2,300 DAU. Each might submit 1 questionnaire and book 1 appointment = ~5,000 writes/day = 0.06 QPS. This is tiny — a single Postgres instance handles this trivially. No need for sharding, read replicas, or caching at this scale."

That's a staff-level estimation: it grounds the design in reality and prevents over-engineering.

---

### Phase 3: Design (Minutes 12-30)

This is the core. Walk through it in this order:

#### Step 1: User Story Walkthrough

Start with a concrete user flow, not abstract boxes.

"Let me walk through what happens when a patient submits a questionnaire:

1. Patient logs in, fills out symptoms form
2. Frontend sends POST /api/questionnaires
3. Backend maps symptoms to specialties
4. Patient then requests matched clinicians — GET /api/clinicians/match
5. Backend filters by state licensure, ranks by specialty fit + availability
6. Patient selects a clinician, views available slots
7. Patient books a slot — POST /api/appointments
8. Backend locks the slot row, creates the appointment, returns confirmation"

This shows you think in flows, not just components.

#### Step 2: System Diagram

Draw it. Label everything. Use standard shapes:

- Rectangles = services
- Cylinders = databases
- Arrows = data flow (label with protocol: REST, gRPC, async)
- Clouds = external systems (EHR, payment, email)

Iterate visually — start simple, add detail as you discuss.

#### Step 3: Data Model

Identify entities and relationships. Think about:

- Primary keys and foreign keys
- Indexes (driven by access patterns, not guesses)
- Normalization vs. denormalization trade-offs
- What's a separate table vs. a column vs. a JSON blob

"StateLicense is its own entity, not a string array on Clinician. Licenses have expiration dates and verification status — a string array can't capture that."

#### Step 4: API Surface

Define the key endpoints. Include:

- HTTP method + path
- Key request/response fields
- Status codes for success and error cases
- Any async patterns (202 + polling vs. WebSocket)

Don't design every endpoint — focus on the ones that reveal interesting decisions.

#### Step 5: Identify the Interesting Problems

As you design, verbally earmark the hard parts:

"There are two interesting problems here: (1) the matching algorithm — how we rank clinicians beyond simple filtering, and (2) concurrent booking — how we prevent double-booking a time slot. Let me dig into both."

---

### Phase 4: Deep Dive (Minutes 30-40)

Pick 1-2 areas where the real engineering challenge lives. Show depth.

#### Patterns to Reference

| Pattern                                         | When to Use                               | Example                                  |
| ----------------------------------------------- | ----------------------------------------- | ---------------------------------------- |
| **Pessimistic locking** (`SELECT...FOR UPDATE`) | Low contention, critical correctness      | Booking a time slot                      |
| **Optimistic locking** (version column)         | Higher contention, retriable              | Editing a shared document                |
| **Circuit breaker**                             | Calling unreliable external services      | EHR API integration                      |
| **Retry with exponential backoff**              | Transient failures                        | Sending notifications                    |
| **Dead letter queue**                           | Handling poison messages                  | Failed async jobs                        |
| **CQRS**                                        | Read/write patterns diverge significantly | Dashboard reads vs. transactional writes |
| **Event sourcing**                              | Need full audit trail of state changes    | Financial transactions, compliance       |
| **Saga pattern**                                | Distributed transactions across services  | Multi-step booking with payment          |

#### CAP Theorem — With Real Examples

Don't just define CAP. Apply it:

| System              | Choice                                      | Why                                                 |
| ------------------- | ------------------------------------------- | --------------------------------------------------- |
| Banking / payments  | **CP** (consistency + partition tolerance)  | Never show wrong balance. Downtime > incorrect data |
| Social media feed   | **AP** (availability + partition tolerance) | Stale likes are fine. Downtime is not               |
| Shopping cart       | **AP**                                      | Always accept items. Merge conflicts later          |
| Appointment booking | **CP**                                      | Double-booking is worse than brief unavailability   |

#### PACELC — The More Complete Picture

"If there is a **P**artition: choose **A**vailability or **C**onsistency. **E**lse (normal operation): choose **L**atency or **C**onsistency."

- DynamoDB: PA/EL — available during partitions, low latency normally
- Postgres: PC/EC — consistent always, at the cost of latency under load

#### Deep Dive Template

When going deep on a component:

1. **State the problem** clearly ("Two patients click 'Book' on the same slot simultaneously")
2. **Show the mechanism** (SQL with `FOR UPDATE`, transaction boundaries)
3. **Walk through the failure case** ("Second transaction waits, finds `is_booked = TRUE`, returns 409")
4. **Name the alternative** ("Optimistic locking with version column is viable but requires client retry logic")
5. **Justify the choice** ("Low contention per-slot, pessimistic is simpler, no retry UX needed")

---

### Phase 5: Operational Readiness (Minutes 40-45)

This is where staff-level engineers separate from senior. Don't skip it.

#### Monitoring & Observability

- **Metrics**: What do you measure? (latency p50/p95/p99, error rate, QPS, queue depth)
- **Logs**: Centralized, structured, searchable (ELK, CloudWatch)
- **Traces**: Distributed tracing across services (OpenTelemetry)
- **Alerts**: What triggers a page? What's warning vs. critical?

#### Failure Modes

- "What happens when the database goes down?" (failover, read replicas)
- "What happens when the EHR API is slow?" (circuit breaker, timeout, fallback)
- "What happens when a deployment goes bad?" (rollback strategy, canary deploys)

#### Deployment Strategy

- Blue/green, canary, or rolling?
- Database migration strategy (backward-compatible schema changes)
- Feature flags for gradual rollout?

---

## 3. The Staff-Level Difference

### What separates staff from senior in these conversations

| Behavior            | Senior                                                | Staff                                                                 |
| ------------------- | ----------------------------------------------------- | --------------------------------------------------------------------- |
| **Decision-making** | "We could use Postgres or Mongo..."                   | "I'm choosing Postgres — I need transactions across these tables"     |
| **Complexity**      | Reaches for sophisticated solutions to show depth     | "Let me check if we actually need that"                               |
| **Focus**           | Equal time on all components                          | Quickly identifies and gravitates to the hard parts                   |
| **Time horizon**    | Thinks 6-12 months ahead                              | Thinks 1-2 years ahead, considers migration paths                     |
| **Communication**   | Explains concepts thoroughly, sometimes over-explains | Treats interviewer as peer, uses patterns as shorthand                |
| **Experience**      | Demonstrates knowledge                                | Demonstrates wisdom — "In a past system, we hit X with this approach" |
| **Scope**           | Deep on one service or team                           | Considers cross-service concerns, org-wide patterns                   |

### Staff-Level Statements That Land Well

- "At this scale, a single Postgres instance is fine. I'd add read replicas at 10x."
- "I'm choosing slot-based availability over calendar math because slots are lockable rows — simpler concurrency model."
- "This is where I'd add an audit log. In healthcare, you need a tamper-proof trail of every PHI access."
- "Let me sketch the happy path first, then we can talk failure modes."
- "The matching algorithm is deterministic and explainable. ML-based matching is premature at 5,000 clinicians — we'd need outcome data first."

### Staff-Level Statements to Avoid

- "We should use Kafka for this." (Why? What's the throughput? A simple queue might suffice.)
- "Let me explain how a load balancer works." (Your interviewer knows.)
- "We could do X or Y or Z — what do you think?" (Make a decision.)
- "Let's design for a billion users." (The problem says 230K patients.)

---

## 4. Trade-Off Analysis Toolkit

### The 5-Step Trade-Off Formula

Every significant design decision should follow this pattern:

1. **Name the decision**: "For concurrency control on appointment booking..."
2. **State your choice**: "I'm using pessimistic locking (`SELECT...FOR UPDATE`) on the slot row."
3. **Brief rationale**: "Low contention per-slot, no retry logic needed, proven pattern."
4. **Name the alternative**: "Optimistic locking with a version column."
5. **Why not**: "Requires client-side retry loops. Not worth the complexity at this contention level."

### Common Trade-Off Dimensions

| Dimension                         | Tension      | When to Choose Left            | When to Choose Right                |
| --------------------------------- | ------------ | ------------------------------ | ----------------------------------- |
| Consistency vs. Availability      | CAP          | Financial data, bookings       | Social feeds, caches                |
| Latency vs. Consistency           | PACELC       | User-facing reads              | Payment processing                  |
| Simplicity vs. Flexibility        | Architecture | Known requirements, small team | Rapidly evolving product            |
| Sync vs. Async                    | Processing   | User needs immediate response  | Heavy processing (OCR, ML)          |
| Monolith vs. Services             | Coupling     | Small team, single deploy      | Multiple teams, independent scaling |
| Build vs. Buy                     | Ownership    | Core differentiator            | Commodity (auth, email, SMS)        |
| Normalization vs. Denormalization | Data         | Write-heavy, data integrity    | Read-heavy, query performance       |
| Pre-compute vs. On-demand         | Performance  | Frequent reads, stable data    | Infrequent reads, volatile data     |

### What Makes a Trade-Off Analysis Strong vs. Weak

**Strong**: "Using Redis cache will reduce DB load by ~80% for the matching query, but it adds cache invalidation complexity. Since clinician availability changes frequently, I'd use a short TTL (60s) and accept slightly stale results for the initial ranking — the booking itself always hits the source of truth."

**Weak**: "I'll add Redis for caching because it's fast." (No quantification, no trade-off acknowledgment, no invalidation strategy.)

---

## 5. Probing Questions Cheat Sheet

Quick-reference questions to ask yourself (or the interviewer) at each stage.

### Requirements

- What entity is being affected? (user, appointment, slot, document)
- What's the read/write ratio?
- What percentiles should we optimize for? (p50, p95, p99)
- Is strong consistency required, or is eventual consistency acceptable?
- What's the geographic distribution?
- What compliance requirements apply?

### Data Model

- What are the access patterns? (query by patient? by clinician? by date range?)
- What needs indexes? (driven by WHERE clauses, not intuition)
- What's the cardinality of relationships? (1:1, 1:N, N:M)
- Should this be a separate table or a column? (does the "attribute" have its own attributes?)
- What's the natural primary key? Can we use UUIDs? Do we need sequential IDs?

### Concurrency

- Can two requests modify this row at the same time?
- What's the contention level? (2-3 competing requests vs. 10,000)
- What's the locking strategy? (pessimistic vs. optimistic)
- What's the transaction boundary? (what must be atomic?)
- What does the user experience when they lose the race? (409 error, retry, queue)

### Failure & Resilience

- What happens when this component goes down?
- How do we detect the failure? (health checks, heartbeats, timeouts)
- How do we recover? (failover, retry, dead letter queue, human intervention)
- What's the blast radius? (does one service failure cascade?)
- What's our RTO and RPO? (how fast must we recover? how much data can we lose?)

### Scale

- What's the bottleneck? (CPU, memory, I/O, network, database connections)
- Does this partition cleanly? (by user, by region, by tenant)
- What changes at 10x? 100x?
- What can we cache? What's the invalidation strategy?
- Do we need read replicas? Sharding? A different database?

### Security

- Where does PII/PHI flow? (draw the data flow explicitly)
- What needs encryption? (at rest, in transit, in use)
- Who has access? (RBAC, principle of least privilege)
- What needs an audit trail? (especially in healthcare)
- What third parties touch sensitive data? (BAAs required?)

---

## 6. Healthcare-Specific Concerns

### HIPAA Requirements for Architecture Discussions

| Area                      | Requirement                            | Architecture Impact                                       |
| ------------------------- | -------------------------------------- | --------------------------------------------------------- |
| **Encryption at rest**    | AES-256 for all PHI                    | Use encrypted RDS, encrypted S3, KMS-managed keys         |
| **Encryption in transit** | TLS 1.2+ everywhere                    | No internal plaintext — service-to-service also encrypted |
| **Access control**        | RBAC + least privilege + MFA           | Auth middleware on every service, role-based API guards   |
| **Audit logging**         | Every PHI access logged                | Write-once audit log table, tamper-proof, queryable       |
| **Retention**             | Audit logs kept 6+ years               | Separate storage tier, archival strategy                  |
| **Breach notification**   | Report within 72 hours                 | Incident detection pipeline, alerting, runbooks           |
| **BAAs**                  | Required with all vendors touching PHI | AWS BAA, LLM provider BAA, EHR vendor BAA                 |

### EHR Integration Talking Points

- **FHIR R4** is the modern standard (RESTful, JSON-based). Reference resources: Patient, Appointment, Encounter, Coverage.
- **HL7 v2** is legacy but still widespread (pipe-delimited messages). Mention it if asked about existing systems.
- **Sync strategy**: Event-driven (FHIR Subscriptions) > polling > batch. Discuss eventual consistency.
- **Vendor sandboxes**: Always test with EHR vendor's sandbox environment before production.

### AI + HIPAA

- PHI must never leave HIPAA-compliant boundaries
- LLM providers must sign a BAA (AWS Bedrock, Azure OpenAI — not raw OpenAI API)
- De-identification before sending to non-BAA services
- Structured output validation — never trust raw LLM output for clinical decisions
- Human-in-the-loop for high-stakes determinations (eligibility, coverage)

---

## 7. Anti-Patterns to Avoid

| Anti-Pattern                          | Why It's Bad                                            | What to Do Instead                                                       |
| ------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Skipping requirements**             | You'll design the wrong system                          | Spend 5-7 minutes clarifying, even if it feels slow                      |
| **Over-explaining basics**            | Signals you just learned them                           | Say "standard load balancer setup" and move on                           |
| **Listing options without deciding**  | Shows indecisiveness                                    | Pick one, justify briefly, name the alternative                          |
| **Designing for unrealistic scale**   | Shows you don't ground designs in reality               | Estimate first, then design for actual scale + 10x headroom              |
| **Ignoring operational concerns**     | "Disconnected from production realities"                | Always mention monitoring, failure modes, deployment                     |
| **Getting defensive when challenged** | Shows ego over collaboration                            | "Good point — let me reconsider" or "Here's why I'd still lean toward X" |
| **Monologuing for 20 minutes**        | Shows poor collaboration skills                         | Pause every 5-7 minutes, check in with interviewer                       |
| **Trendy tech without justification** | Shows hype-driven engineering                           | Always state the problem before naming the technology                    |
| **Going silent when stuck**           | Interviewer can't help if they don't know where you are | Think aloud: "I'm considering X because of Y, but I'm not sure about Z"  |

---

## 8. Communication Patterns

### Checkpoint Questions (Use These)

| When                          | Say                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------- |
| After clarifying requirements | "Does this match your expectations for scope?"                                         |
| After high-level design       | "Should I go deeper on the matching algorithm or the booking concurrency?"             |
| Before a deep dive            | "Which area interests you most?"                                                       |
| When making a major decision  | "I'm choosing X over Y because Z — does that resonate?"                                |
| When stuck                    | "I'm thinking through the trade-off between A and B. The key factor is..."             |
| When running low on time      | "I have about 5 minutes left — let me hit the key trade-offs and operational concerns" |

### How to Structure Your Verbal Walkthrough

1. **Narrate as you draw**: "This box is the matching service. It reads from the clinician and license tables, filters by state, and ranks by specialty overlap."
2. **Name patterns by name**: "This is the saga pattern" or "pessimistic locking here" — it shows shared vocabulary.
3. **Be concrete, not abstract**: "When Lisa in California submits a questionnaire with hot flashes and weight gain, the system maps those to HRT and weight management specialties" — not "the system processes user input."
4. **Flag complexity early**: "The booking endpoint is the most interesting part — it needs a pessimistic lock to prevent double-booking. Let me walk through the transaction."
5. **Summarize trade-offs as you go**: Don't save them all for the end. "I chose slots over calendar math because slots are atomic lockable rows."

---

## 9. Quick-Start Checklist

Use this before your interview starts:

- [ ] Know the company's domain (healthcare? fintech? e-commerce?)
- [ ] Know their tech stack (from job posting, research)
- [ ] Have the 45-minute framework in your head (clarify → estimate → design → deep dive → ops)
- [ ] Be ready to draw (have Excalidraw or whiteboard ready)
- [ ] Have your trade-off formula ready (chose X, considered Y, because Z)
- [ ] Remember: make decisions, don't list options
- [ ] Remember: start simple, add complexity only when justified
- [ ] Remember: check in with the interviewer every 5-7 minutes
- [ ] Remember: mention monitoring, failure modes, and deployment
- [ ] For healthcare: be ready to discuss HIPAA, PHI encryption, audit logging, EHR integration

---

## Sources

### Frameworks & Methodology

- [RESHADED Framework](https://www.educative.io/blog/use-reshaded-for-system-design-interviews)
- [RADIO Framework](https://www.greatfrontend.com/front-end-system-design-playbook/framework)
- [Senior Engineer's Guide to System Design](https://interviewing.io/guides/system-design-interview)
- [System Design Delivery Framework (HelloInterview)](https://www.hellointerview.com/learn/system-design/in-a-hurry/delivery)
- [45-Minute Framework (LockedInAI)](https://www.lockedinai.com/blog/system-design-interview-in-45-minutes-the-complete-framework)

### Staff vs. Senior Distinctions

- [5 Keys to Staff-Level System Design (HelloInterview)](https://www.hellointerview.com/blog/staff-level-system-design)
- [What is Expected at Each Level (HelloInterview)](https://www.hellointerview.com/blog/the-system-design-interview-what-is-expected-at-each-level)
- [Staff Engineer Interview Failures at Google/Meta/Netflix](https://medium.com/engineering-playbook/staff-engineer-interview-i-failed-at-google-meta-and-netflix-then-i-understood-the-pattern-9e38a17cff70)
- [Staff Eng: Interviewing for Staff-Plus Roles](https://staffeng.com/guides/interviewing-staff-plus-roles/)

### Trade-Offs & Patterns

- [Complex System Design Tradeoffs (DesignGurus)](https://www.designgurus.io/blog/complex-system-design-tradeoffs)
- [10 System Design Trade-offs (Better Engineering)](https://betterengineers.substack.com/p/system-design-trade-offs)
- [Trade-offs in Modern System Design (Deep Engineering)](https://deepengineering.substack.com/p/trade-offs-in-modern-system-design)
- [Architecture Patterns for Resilient Systems](https://www.geeksforgeeks.org/system-design/architecture-patterns-for-resilient-systems/)

### CAP/PACELC

- [CAP vs. PACELC (DesignGurus)](https://www.designgurus.io/blog/system-design-interview-basics-cap-vs-pacelc)
- [CAP Theorem (HelloInterview)](https://www.hellointerview.com/learn/system-design/core-concepts/cap-theorem)
- [Complete CAP & PACELC Guide 2026 (DesignGurus)](https://designgurus.substack.com/p/complete-cap-and-pacelc-guide-for)

### Estimation & Benchmarks

- [Back-of-Envelope Estimation (ByteByteGo)](https://bytebytego.com/courses/system-design-interview/back-of-the-envelope-estimation)
- [Mastering Estimation (DesignGurus)](https://www.designgurus.io/blog/back-of-the-envelope-system-design-interview)

### Anti-Patterns

- [Common Mistakes (GeeksForGeeks)](https://www.geeksforgeeks.org/system-design/common-mistakes-to-avoid-in-a-system-design-interview/)
- [Top 6 Mistakes (Educative)](https://www.educative.io/blog/six-common-system-design-interview-mistakes)

### Evaluation Rubrics

- [System Design Rubric (Exponent)](https://www.tryexponent.com/courses/system-design-interviews/system-design-interview-rubric)
- [Google Coding Interview Rubric](https://www.tryexponent.com/blog/google-coding-interview-rubric)
- [Google L6 Interview Guide (HelloInterview)](https://www.hellointerview.com/guides/google/l6)
- [Meta System Design Interview](https://igotanoffer.com/blogs/tech/meta-system-design-interview)

### Healthcare Architecture

- [HIPAA-Compliant AI Development (WebKorps)](https://www.webkorps.com/blog/hipaa-compliant-ai-software-development/)
- [Healthcare Integration Platforms 2026 (Jelvix)](https://jelvix.com/blog/healthcare-platform-integration-strategy)
- [Custom EHR Architecture 2026 (CapMinds)](https://www.capminds.com/blog/custom-ehr-architecture-in-2026-how-to-build-for-scalability-interoperability-and-future-regulations/)
- [HIPAA Security Architecture (Intellivon)](https://intellivon.com/blogs/make-hipaa-security-architecture/)

### General Interview Prep

- [ByteByteGo System Design Course](https://bytebytego.com/)
- [Pragmatic Engineer: Preparing for System Design](https://blog.pragmaticengineer.com/preparing-for-the-systems-design-and-coding-interviews/)
- [A Framework for System Design Interviews (ByteByteGo)](https://bytebytego.com/courses/system-design-interview/a-framework-for-system-design-interviews)
