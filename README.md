# Interview Prep Sandbox

A monorepo for practicing system design and building production-quality POCs for technical interviews. Each project explores different patterns in AI integration, real-time systems, concurrency, and modern web development.

The repo includes an AI-assisted workflow that takes you from company research to a working POC — see [The Workflow](#the-workflow) below.

## The Workflow

A 6-step cycle for preparing for a specific company's technical interview. Each step produces artifacts that feed into the next.

```
1. Research Company      → docs/<company>/research.md
2. Research Tech Stack   → docs/<company>/tech-stack.md
3. Generate Challenge    → docs/<company>/tech-challenge.md  (includes answer key)
4. Create PRD            → tasks/prd-<feature>.md
5. Build POC with Ralph  → working app on ralph/<branch>
6. Deep Dive             → docs/<project>/<topic>.md
```

### How to Use

**Step 1-2: Research.** Tell your AI agent the company name and role. It researches the company, tech stack, and architecture, then produces structured docs in `docs/<company>/`. See existing examples in [Docs](#docs).

**Step 3: Generate Challenge.** Based on the research, generate a realistic architecture challenge grounded in the company's product domain. The output includes an answer key reviewed for production readiness, scale, and security.

**Step 4: Create PRD.** Convert the answer key into a Product Requirements Document with user stories, acceptance criteria, and technical considerations. Save to `tasks/prd-<feature>.md`.

**Step 5: Build with Ralph.** Convert the PRD to `scripts/ralph/prd.json`, then run Ralph to autonomously implement the POC:

```bash
cd scripts/ralph
./ralph.sh --tool claude    # or --tool amp
```

Ralph spawns a fresh agent per iteration, implements one user story at a time, and tracks progress in `progress.txt`.

**Step 6: Deep Dive.** After building, generate explanation docs for any concept you want to understand better — architecture patterns, security testing, data pipelines, etc.

### Agent Instructions

- **Any AI agent:** Read [`AGENTS.md`](AGENTS.md) for the full workflow instructions and codebase patterns
- **Claude Code:** Also has `/research`, `/tech-challenge`, `/prd`, `/ralph`, and `/deep-dive` skills

---

## Apps

| App                                     | Description                                     | Stack                                               | Port |
| --------------------------------------- | ----------------------------------------------- | --------------------------------------------------- | ---- |
| [`tictactoe`](apps/tictactoe)           | AI tic-tac-toe game frontend                    | Next.js 14, Tailwind CSS                            | 2025 |
| [`tictactoe-api`](apps/tictactoe-api)   | Game backend + 2-player WebSocket + AI opponent | NestJS 10, TypeORM, PostgreSQL, Redis, LangGraph    | 3002 |
| [`realty-ai`](apps/realty-ai)           | Real estate email generation frontend           | Next.js 14, Tailwind CSS, Apollo Client             | 2024 |
| [`realty-ai-api`](apps/realty-ai-api)   | Email gen AI pipeline + promptfoo evals         | NestJS 8, TypeORM, PostgreSQL (pgvector), LangGraph | 3001 |
| [`shift-api`](apps/shift-api)           | Healthcare shift marketplace backend            | NestJS 10, TypeORM, PostgreSQL                      | 3003 |
| [`shift-ui`](apps/shift-ui)             | Shift marketplace frontend                      | Next.js 14, Tailwind CSS                            | 2026 |
| [`telehealth-api`](apps/telehealth-api) | Clinician matching + scheduling backend         | NestJS 10, TypeORM, PostgreSQL                      | 3004 |
| [`telehealth-ui`](apps/telehealth-ui)   | Clinician matching frontend                     | Next.js 14, Tailwind CSS                            | 2027 |
| [`dashboard`](apps/dashboard)           | Dashboard app                                   | React 18, Webpack 5                                 | 2022 |
| [`web`](apps/web)                       | Web app                                         | Next.js 13                                          | 2023 |

---

## Docs

### Company Research (anonymized)

| Directory                                                  | Contents                                                                                     |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [`the-ai-search-platform/`](docs/the-ai-search-platform)   | Tech stack (TypeScript monorepo, Milvus, MCP), interview prep with worked examples           |
| [`the-telehealth-platform/`](docs/the-telehealth-platform) | Reverse-engineered architecture, tech challenge with Django ↔ NestJS mapping and answer keys |
| [`the-workforce-platform/`](docs/the-workforce-platform)   | Research (Effect + Drizzle + PlanetScale stack, YC W23)                                      |

### Project Documentation

| Directory                                | Contents                                                                              |
| ---------------------------------------- | ------------------------------------------------------------------------------------- |
| [`RealtyAi/`](docs/RealtyAi)             | LangGraph email pipeline architecture, promptfoo evals + red-team, data flow diagrams |
| [`ai-tic-tac-toe/`](docs/ai-tic-tac-toe) | AI game implementation plan, secure backend refactor with 2-player WebSocket          |

### Reference Guides

| File                                                                      | Description                                       |
| ------------------------------------------------------------------------- | ------------------------------------------------- |
| [`architecture-interview-guide.md`](docs/architecture-interview-guide.md) | 45-minute framework for architecture interviews   |
| [`pgvector-similarity-search.md`](docs/pgvector-similarity-search.md)     | Vector similarity search patterns with PostgreSQL |
| [`staff-interview-checklist.md`](docs/staff-interview-checklist.md)       | Interview preparation checklist                   |

---

## Tasks (PRDs)

| PRD                                                                          | Description                                                       |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`prd-ai-tictactoe.md`](tasks/prd-ai-tictactoe.md)                           | AI tic-tac-toe with LangGraph + AWS Bedrock                       |
| [`prd-secure-tictactoe-refactor.md`](tasks/prd-secure-tictactoe-refactor.md) | Backend game engine + 2-player WebSocket + security hardening     |
| [`prd-realtyai-poc.md`](tasks/prd-realtyai-poc.md)                           | Real estate email gen with LangChain, weather API, vector search  |
| [`prd-shift-marketplace.md`](tasks/prd-shift-marketplace.md)                 | Two-sided healthcare shift marketplace with concurrent booking    |
| [`prd-clinician-matching.md`](tasks/prd-clinician-matching.md)               | Clinician matching with weighted scoring + appointment scheduling |

---

## Quick Start

### Prerequisites

- Node.js >= 18
- [pnpm](https://pnpm.io/) 10.x
- [Docker](https://www.docker.com/) (for PostgreSQL + Redis)

### Install

```bash
pnpm install
```

### Run All Apps

```bash
pnpm dev
```

Or start individual apps — each has its own Docker Compose for its database. Example:

```bash
# Start the TicTacToe stack
cd apps/tictactoe-api
docker-compose up -d      # PostgreSQL + Redis
pnpm dev                   # Backend on :3002

cd apps/tictactoe
pnpm dev                   # Frontend on :2025
```

---

## Monorepo Structure

```
apps/                   # Full-stack applications (see table above)
packages/
  tsconfig/             # Shared TypeScript configs
  ui/                   # Shared React component library
docs/                   # Research, challenges, and reference docs
tasks/                  # PRDs (Product Requirements Documents)
scripts/ralph/          # Ralph autonomous agent system
```

## Tooling

- **pnpm** workspaces for dependency management
- **Turbo** for build orchestration and caching
- **ESLint** + **Prettier** for code quality
- **Husky** + **lint-staged** for pre-commit hooks
- **Changesets** for version management
