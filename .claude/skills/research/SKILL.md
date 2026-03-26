---
name: research
description: 'Research a company and role for interview preparation. Produces structured research docs covering business model, tech stack, architecture, and interview process. Triggers on: research company, look up company, prep for interview at, what does company use, research tech stack.'
---

# Company Research

Research a company and role, producing structured doc artifacts for interview preparation.

---

## The Job

1. Get the company name and role from the user (or detect from conversation)
2. Research the company thoroughly using web search
3. Generate structured doc artifacts in `docs/<company-slug>/`
4. Do NOT start generating challenges or PRDs — just research

---

## Step 1: Gather Context

Ask the user if not already clear:

1. What company?
2. What role? (Staff Engineer, Principal Engineer, etc.)
3. Do you have a job posting URL?

---

## Step 2: Research

Search for and cross-reference these sources:

- **Company website** — product pages, about, careers
- **Job postings** — required skills, tech stack mentions, team info
- **Tech blog / engineering blog** — architecture decisions, migration stories, tooling
- **GitHub repos** — open source projects, language breakdown, monorepo structure
- **Conference talks** — engineering leadership presentations
- **Crunchbase** — funding stage, investors, revenue signals
- **LinkedIn** — team size, engineering headcount, key people

---

## Step 3: Generate Artifacts

### `docs/<company-slug>/research.md`

Follow the structure of [`docs/the-telehealth-platform/research.md`](../../docs/the-telehealth-platform/research.md):

1. **The Business** — What they do, market position, funding, customer/user count
2. **Confirmed Tech Stack** — Table: layer → technology (only confirmed info, mark inferred items)
3. **Core Product Offerings** — 2-3 main products with technical deep dive on how they likely work
4. **Team & Engineering Culture** — Size, distribution, hiring philosophy
5. **Interview Process** — What to expect, number of rounds, focus areas
6. **Key Architectural Patterns** — What design patterns their system likely uses
7. **Sources** — All references used

### `docs/<company-slug>/tech-stack.md`

Follow the structure of [`docs/the-ai-search-platform/tech-stack.md`](../../docs/the-ai-search-platform/tech-stack.md):

1. **Tech Stack Table** — Comprehensive layer-by-layer breakdown
2. **Architecture Deep Dive** — Monorepo structure, API patterns, data layer, deployment
3. **Key Engineering Decisions** — Why they chose their stack, notable migrations
4. **Relevant Protocols/Standards** — Industry-specific tech (FHIR, OpenTelemetry, MCP, etc.)
5. **Interview Relevance** — What patterns to emphasize when talking to this company

### `docs/<company-slug>/interview-prep.md` (Optional)

Generate if enough information is available. Follow [`docs/the-ai-search-platform/interview-prep.md`](../../docs/the-ai-search-platform/interview-prep.md):

1. **Key Themes** — What this company values in candidates
2. **Worked Examples** — How to use projects in this repo to demonstrate relevant experience
3. **Questions to Prepare For** — Likely interview questions based on role and domain
4. **Questions to Ask** — Thoughtful questions that demonstrate domain understanding

---

## Output

- **Format:** Markdown (`.md`)
- **Location:** `docs/<company-slug>/` (create directory if needed)
- **Naming:** Use kebab-case slug derived from company name

---

## Checklist Before Saving

- [ ] Business model and product clearly described
- [ ] Tech stack sourced from job postings, blogs, or repos (not guessed)
- [ ] Inferred items clearly marked as inferred
- [ ] Interview process documented if discoverable
- [ ] Sources section lists all references
- [ ] Company slug is descriptive and kebab-case
