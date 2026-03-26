# Interview Prep Sandbox

## Who You Are Talking To

You are working with an experienced engineer (staff/principal level) preparing for technical interviews. They know how to code — they need research, strategy, and practice building production-quality systems.

Adjust your communication accordingly:

- Communicate as a peer: concise, technical, no hand-holding
- When explaining concepts, assume engineering context and go deep
- Reference specific patterns, trade-offs, and scale considerations
- Be direct about weaknesses in an approach — the engineer needs honest assessment, not encouragement
- When reviewing answer keys or implementations, apply production-level scrutiny

## The Interview Prep Flow

This sandbox follows a 6-step cycle. Each step produces artifacts that feed into the next.

```
Step 1: Research Company     → docs/<company>/research.md
Step 2: Research Tech Stack  → docs/<company>/tech-stack.md
Step 3: Generate Challenge   → docs/<company>/tech-challenge.md
Step 4: Create PRD           → tasks/prd-<feature>.md
Step 5: Build POC            → working app on ralph/<branch>
Step 6: Deep Dive            → docs/<project>/<topic>.md
```

| Step                   | Action                                                            | Input                          | Output                             |
| ---------------------- | ----------------------------------------------------------------- | ------------------------------ | ---------------------------------- |
| 1. Research Company    | Research the company, role, business model, and interview process | Company name + job posting URL | `docs/<company>/research.md`       |
| 2. Research Tech Stack | Research architecture, stack choices, engineering patterns        | Company research               | `docs/<company>/tech-stack.md`     |
| 3. Generate Challenge  | Create architecture challenge + reviewed answer key               | Research docs                  | `docs/<company>/tech-challenge.md` |
| 4. Create PRD          | Convert the answer key into an implementable PRD                  | Answer key from challenge      | `tasks/prd-<feature>.md`           |
| 5. Build POC           | Autonomous implementation via Ralph                               | PRD converted to prd.json      | Working POC on `ralph/<branch>`    |
| 6. Deep Dive           | Explain any concept the engineer wants to understand deeper       | Implemented code or concept    | `docs/<project>/<topic>.md`        |

---

## Step 1-2: Research

### What to Search For

- Company website — product pages, about page, careers
- Job postings — required skills, team structure, tech stack mentions
- Tech blog / engineering blog — architecture posts, migration stories, tooling decisions
- GitHub repositories — open source projects, monorepo structure, language breakdown
- Conference talks — engineering leadership presentations, tech deep dives
- Crunchbase / funding — stage, investors, revenue signals
- Glassdoor / Blind — interview process, team culture

### Output: `docs/<company-slug>/research.md`

Follow the structure of existing research docs. Key sections:

1. **The Business** — What they do, market position, funding, patient/customer count
2. **Confirmed Tech Stack** — Table of layer → technology (only include confirmed info)
3. **Core Product Offerings** — 2-3 main products/features with technical detail on how they likely work
4. **Team & Engineering Culture** — Size, distribution, hiring signals
5. **Interview Process** — What to expect, rounds, focus areas
6. **Sources** — All references (URLs can be redacted for privacy if sharing publicly)

Template: [`docs/the-telehealth-platform/research.md`](docs/the-telehealth-platform/research.md)

### Output: `docs/<company-slug>/tech-stack.md`

Deeper dive into architecture. Key sections:

1. **Tech Stack Table** — Comprehensive layer-by-layer breakdown
2. **Architecture Patterns** — Monorepo structure, API design, data layer
3. **Key Engineering Decisions** — Why they chose their stack, migration history
4. **Relevant Protocols/Standards** — MCP, OpenTelemetry, etc.
5. **Interview Relevance** — What patterns to emphasize in conversation

Template: [`docs/the-ai-search-platform/tech-stack.md`](docs/the-ai-search-platform/tech-stack.md)

### Optional: `docs/<company-slug>/interview-prep.md`

If enough information is available, generate an interview strategy doc covering:

- Key themes to emphasize
- Worked examples using projects in this repo
- Company values and how to demonstrate alignment

Template: [`docs/the-ai-search-platform/interview-prep.md`](docs/the-ai-search-platform/interview-prep.md)

---

## Step 3: Generate Tech Challenge

Read the company's research docs, then generate a realistic architecture challenge.

### Challenge Structure

1. **Stack Concept Map** — If the company uses a different stack (Django, Rails, Go), provide a mapping table to NestJS/TypeScript equivalents so the engineer can translate fluently during the interview
2. **Exercise 1** (45 min) — Architecture design grounded in the company's core product domain
   - Scenario description
   - Functional requirements
   - Non-functional requirements (scale, latency, availability)
   - Constraints and assumptions
3. **Exercise 2** (45 min) — Second architecture problem covering a different part of the product
4. **Answer Key** for each exercise:
   - Data model (entities, relationships, TypeORM decorators)
   - API design (endpoints, DTOs, status codes, error cases)
   - Architecture diagram (ASCII)
   - Key implementation patterns (pessimistic locking, caching, queues)
   - Production considerations (what to validate, where concurrency matters)
   - Scale analysis (what breaks at 10x, 100x, 1000x)
   - Trade-offs and alternatives considered

### Answer Key Review Pass

Before saving, review the answer key against these criteria:

- **Production readiness:** Error handling, input validation, proper HTTP status codes
- **Security:** Authentication, authorization, OWASP top 10 relevant to the domain
- **Concurrency:** Identify shared mutable state, apply pessimistic locking where needed
- **Scale:** What's the bottleneck? What would you change at 10x traffic?
- **Operational maturity:** Logging, monitoring, graceful degradation

Template: [`docs/the-telehealth-platform/tech-challenge.md`](docs/the-telehealth-platform/tech-challenge.md)

---

## Step 4: Create PRD

Extract the answer key's architecture into a Product Requirements Document.

### PRD Structure

1. **Introduction** — What we're building and why
2. **Goals** — Specific, measurable objectives
3. **User Stories** (US-001, US-002, etc.) — Each with:
   - Description: "As a [user], I want [feature] so that [benefit]"
   - Acceptance Criteria: Verifiable checklist (not vague)
   - Each story small enough for one Ralph iteration
4. **Functional Requirements** — Numbered (FR-1, FR-2, etc.)
5. **Non-Goals** — What's explicitly out of scope
6. **Technical Considerations** — Stack choices, integration points
7. **Production Considerations** — Validation, auth, concurrency, error handling

### Story Ordering

Stories must be ordered by dependency:

1. Database schema / entities
2. Backend services / API endpoints
3. Frontend UI components
4. Integration / E2E verification

Save to: `tasks/prd-<feature-name>.md`

---

## Step 5: Build POC with Ralph

Ralph is an autonomous agent loop that implements PRDs one user story at a time.

### Workflow

1. Convert the PRD to `scripts/ralph/prd.json` format:

   ```json
   {
   	"project": "ProjectName",
   	"branchName": "ralph/feature-name",
   	"description": "Feature description",
   	"userStories": [
   		{
   			"id": "US-001",
   			"title": "Story title",
   			"description": "As a...",
   			"acceptanceCriteria": ["Criterion 1", "Typecheck passes"],
   			"priority": 1,
   			"passes": false,
   			"notes": ""
   		}
   	]
   }
   ```

2. Run Ralph:

   ```bash
   cd scripts/ralph
   ./ralph.sh [--tool amp|claude] [max_iterations]
   ```

3. Ralph spawns a fresh agent per iteration, reads the PRD, implements the next failing story, and tracks progress in `scripts/ralph/progress.txt`.

4. Each story must be completable in one iteration (one context window). If a story is too big, split it.

---

## Step 6: Deep Dive

After building, the engineer may want to understand specific implementation concepts in depth.

### What to Produce

A reference doc explaining a concept as implemented in this codebase:

1. **What it is** — The concept and why it matters
2. **How it works here** — File paths, code flow, architecture diagram
3. **Key patterns** — Design decisions and trade-offs
4. **Production considerations** — What changes at scale
5. **Related concepts** — Links to further reading

Save to: `docs/<project>/<topic>.md`

Templates:

- [`docs/RealtyAi/llm-security-testing.md`](docs/RealtyAi/llm-security-testing.md) — Promptfoo eval/redteam architecture
- [`docs/RealtyAi/ai-email-generation-architecture.md`](docs/RealtyAi/ai-email-generation-architecture.md) — LangGraph pipeline architecture

---

## Codebase Patterns

This is a **pnpm + Turbo monorepo**. Follow these patterns for all new code:

### Structure

```
apps/           # Full-stack applications
packages/       # Shared code (tsconfig, UI components)
docs/           # Research, challenges, and reference docs
tasks/          # PRDs (Product Requirements Documents)
scripts/ralph/  # Autonomous agent system
```

### Tech Stack

| Layer             | Technology                                              |
| ----------------- | ------------------------------------------------------- |
| **Frontend**      | Next.js 14, React 18, Tailwind CSS, shadcn/ui, Radix UI |
| **Backend**       | NestJS (8-10), TypeORM, PostgreSQL                      |
| **AI**            | LangChain, LangGraph, AWS Bedrock (DeepSeek-R1)         |
| **Vector Search** | pgvector (PostgreSQL extension)                         |
| **Real-time**     | Socket.io + Redis                                       |
| **Eval**          | Promptfoo (functional tests, security tests, red-team)  |
| **Code Quality**  | ESLint, Prettier, Husky + lint-staged                   |
| **Build**         | pnpm workspaces, Turbo                                  |

### Key Conventions

- TypeORM with `SnakeNamingStrategy` — all column names are snake_case
- PostgreSQL on non-default ports (54322, 54323, 54324) to avoid conflicts
- `.env.local` for credentials (never committed)
- `pnpm typecheck` for type checking
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`

### Reference Implementation

The TicTacToe app (`apps/tictactoe` + `apps/tictactoe-api`) is the canonical example of the full-stack pattern. It demonstrates:

- NestJS module structure (controller → service → entity)
- TypeORM entity definitions with JSONB columns
- PostGraphile auto-generated GraphQL from PostgreSQL
- WebSocket real-time updates (Socket.io + Redis)
- AI integration via LangGraph + AWS Bedrock
- Pessimistic locking for concurrent-safe operations

## Git Workflow

- **Conventional commits:** `feat:`, `fix:`, `docs:`, `refactor:`, `style:`
- **Branch per feature:** `ralph/<feature-name>` for Ralph-built features
- **Pre-commit hooks:** Husky runs ESLint + Prettier on staged files
- **Never commit:** `.env.local`, credentials, large binaries
