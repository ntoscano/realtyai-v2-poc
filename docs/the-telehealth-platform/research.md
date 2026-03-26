# The Telehealth Platform — Reverse-Engineered Architecture

## The Business

The Telehealth Platform is a virtual specialty clinic for women's midlife hormonal health (perimenopause, menopause). 230K+ patients, all 50 states, $150M+ funding (Series C). Revenue comes from insurance-covered telehealth visits + B2B employer benefits + supplements/custom Rx.

## Confirmed Tech Stack

| Layer               | Technology                                                      |
| ------------------- | --------------------------------------------------------------- |
| **Backend**         | **Django / Django REST Framework (DRF)** — Python               |
| **Frontend**        | **React / Next.js**                                             |
| **CMS**             | Prismic (headless CMS for marketing site)                       |
| **EHR**             | AthenaOne (Athenahealth) — their clinical system of record      |
| **Credentialing**   | Verifiable (Salesforce integration for clinician credentialing) |
| **Prior Auth**      | CoverMyMeds                                                     |
| **Cloud**           | AWS (preferred per job postings)                                |
| **Templating**      | Jinja (server-side rendering for some flows)                    |
| **Eng distributed** | Team includes engineers in India                                |

## The Two Software Offerings

### 1. Insurance Eligibility / Coverage Check (RAG Pipeline)

This is the patient-facing onboarding flow. Here's what happens:

- Patient uploads photo of insurance card
- System extracts plan info (likely OCR → structured data)
- **RAG pipeline** cross-references extracted plan details against The Telehealth Platform's coverage database — which payers they're in-network with, which plan types qualify, what the expected copay/coinsurance/deductible would be
- Returns a near-instant eligibility determination

Why RAG and not just a lookup table: insurance plans are messy. Plan documents, benefit schedules, and coverage rules are semi-structured text. A RAG approach can ingest payer documentation, index it, and answer "does this specific plan cover telehealth menopause care?" with nuance that a simple database lookup can't handle. The knowledge base would include payer contracts, plan benefit summaries, and state-by-state coverage rules.

**Likely architecture:**

```
Insurance card photo → OCR (AWS Textract or similar)
  → Extract: payer, plan ID, group number, member info
  → RAG query against indexed payer/plan documents
  → Eligibility determination + cost estimate
  → Store in patient profile (AthenaOne)
```

### 2. Clinician Matching / Care Delivery Platform

The second offering is the core telehealth platform:

- Patient completes health questionnaire during onboarding
- System matches patient to appropriate clinician based on state licensure, availability, specialty (HRT, weight/GLP-1, mood, etc.)
- Virtual visit scheduling and delivery
- Care plan generation, prescription management (The Telehealth Platform Custom Rx)
- Async messaging between visits
- Integration with AthenaOne for clinical documentation

## Architecture (Reverse-Engineered)

```
┌─────────────────────────────────────────────────┐
│           Next.js Frontend (React)               │
│  Patient Portal  │  Clinician Portal  │  Admin   │
└────────┬─────────┴──────────┬────────┴──────────┘
         │       REST (DRF)   │
         ▼                    ▼
┌─────────────────────────────────────────────────┐
│              Django / DRF Backend                 │
│                                                   │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Eligibility  │  │ Scheduling / Matching    │  │
│  │ Service      │  │ Service                  │  │
│  │ (RAG + OCR)  │  │                          │  │
│  └──────────────┘  └──────────────────────────┘  │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Care Plan /  │  │ Messaging / Comms        │  │
│  │ Rx Service   │  │ Service                  │  │
│  └──────────────┘  └──────────────────────────┘  │
└────────┬─────────────────────┬───────────────────┘
         │                     │
    ┌────▼────┐          ┌─────▼──────┐
    │ AWS     │          │ AthenaOne  │
    │ (S3,    │          │ EHR (FHIR  │
    │ Textract│          │ + proprietary
    │ Bedrock?)          │ APIs)      │
    └─────────┘          └────────────┘
         │
    ┌────▼────────────┐
    │ Vector DB       │
    │ (pgvector or    │
    │  Pinecone)      │
    │ Payer docs,     │
    │ plan benefits   │
    └─────────────────┘
```

## What to Expect in the Tech Screen

Given the job description emphasizes:

1. **"Cross-service architectural patterns"** — They likely have a Django monolith that's growing and needs service boundaries. Expect questions about when/how to extract services, API contracts between them, and managing shared state.

2. **"Architectural reviews to prevent technical debt"** — They want someone who can look at the RAG pipeline or the EHR integration and say "this won't scale because X, here's how we refactor."

3. **"Django/DRF and React/Next.js"** — This is their core stack. Be ready to discuss Django patterns: serializers, viewsets, permissions, middleware, celery for async tasks.

4. **"Agentic coding tools"** — They explicitly value Claude Code / Copilot proficiency. The RAG pipeline work probably involves LangChain or similar.

5. **HIPAA compliance** — Healthcare data. Expect questions about PHI handling, encryption at rest/in transit, audit logging, access controls.

## Key Interview Topics to Prepare

- **RAG architecture**: Document ingestion, chunking strategies, embedding models, vector search, retrieval + generation pipeline. How to keep the knowledge base current as payer contracts change.
- **OCR → structured data**: Insurance card parsing, handling poor image quality, confidence scores, human-in-the-loop fallback.
- **EHR integration patterns**: FHIR R4 resources (Patient, Coverage, Appointment, Encounter), Athena's proprietary APIs, bidirectional sync, handling eventual consistency.
- **Django at scale**: Connection pooling, caching, celery task queues, database optimization, read replicas.
- **Staff engineer scope**: Technical roadmaps, cross-team alignment, RFC processes, migration strategies (they mentioned "large-scale architectural migrations").

## Sources

- [The Telehealth Platform — Homepage](URL redacted)
- [How The Telehealth Platform Works](URL redacted)
- [The Telehealth Platform — Verifiable Case Study](URL redacted)
- [Staff Software Engineer posting](URL redacted)
- [Staff Software Engineer posting](URL redacted)
- [The Telehealth Platform $50M Series C](URL redacted)
- [The Telehealth Platform Pricing & Insurance](URL redacted)
- [Athena FHIR APIs](https://docs.athenahealth.com/api/docs/fhir-apis)
