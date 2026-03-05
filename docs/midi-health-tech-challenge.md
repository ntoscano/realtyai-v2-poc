# Midi Health — Staff Engineer Architecture Challenge

Two architecture design exercises for a virtual healthcare platform: (1) Insurance eligibility via RAG pipeline (45 min), (2) Clinician matching and appointment scheduling (45 min). Each exercise includes a reference architecture answer key.

**Note:** Midi's production stack is Django/DRF + React/Next.js. These exercises use NestJS + TypeScript for practice, with a concept mapping between the two stacks so you can translate fluently during the interview.

---

## Django ↔ NestJS Concept Map

| Django / DRF                            | NestJS / TypeScript                            | Key Differences                                                                                                                                                                                                               |
| --------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `models.py` (Django ORM)                | `*.entity.ts` (TypeORM)                        | Both use decorators. Django: `class Meta` for table config. TypeORM: `@Entity()`, `@Column()` decorators. Django has built-in migration generation; TypeORM has `synchronize` shortcut.                                       |
| `serializers.py` (DRF)                  | DTO + `class-validator`                        | DRF serializers handle validation AND serialization in one class. NestJS splits: DTOs validate input, entity/response classes shape output. DRF serializers also handle nested writes.                                        |
| `ViewSet` + `Router`                    | `@Controller()` + `Service`                    | DRF ViewSets bundle CRUD methods (`list`, `create`, `retrieve`, `update`, `destroy`) with automatic URL routing. NestJS separates: Controller handles HTTP, Service handles business logic. NestJS approach is more explicit. |
| `urls.py` / `router.register()`         | `@Get()`, `@Post()` decorators                 | Django: explicit URL patterns in a central file. NestJS: route decorators on controller methods. Django's is more centralized; NestJS is co-located with handlers.                                                            |
| `Celery` + `Redis` broker               | `@nestjs/bull` + `Redis`                       | Both use Redis-backed job queues. Celery: `@shared_task` decorator, `task.delay()`. Bull: `@Processor()` class, `queue.add()`. Celery is more mature with better retry/scheduling.                                            |
| `django-filter` / `FilterSet`           | Manual query params + `QueryBuilder`           | DRF: declarative filter classes auto-wire to ViewSets. NestJS: you write filter logic manually in the service. Django approach is faster for standard filters.                                                                |
| `permissions.py` / `IsAuthenticated`    | `@UseGuards()` + custom Guard                  | DRF: permission classes checked per-view, composable with `&` and `\|`. NestJS: guards are middleware-like, use `canActivate()`. Similar concept, different API.                                                              |
| `middleware.py`                         | Middleware / Guard / Interceptor / Pipe        | Django has one middleware concept. NestJS splits into 4 layers: Middleware (raw req/res), Guards (auth), Interceptors (transform response), Pipes (validate/transform input).                                                 |
| `manage.py makemigrations` + `migrate`  | TypeORM `migration:generate` + `migration:run` | Django auto-detects model changes and generates migrations. TypeORM requires manual generation or uses `synchronize: true` (dev only). Django migrations are significantly more reliable.                                     |
| `settings.py` / `django-environ`        | `@nestjs/config` / `.env` files                | Django: single settings module, often split per environment. NestJS: `ConfigModule.forRoot()` loads `.env`. Both support environment-specific overrides.                                                                      |
| `pgvector` Django field (`VectorField`) | `pgvector` TypeORM column (`vector` type)      | Same PostgreSQL extension underneath. Django: `from pgvector.django import VectorField`. TypeORM: `@Column({ type: 'vector', length: 1536 })`.                                                                                |
| `select_for_update()`                   | `setLock('pessimistic_write')`                 | Django: `Model.objects.select_for_update().get(id=x)`. TypeORM: `queryBuilder.setLock('pessimistic_write')`. Same SQL underneath (`SELECT ... FOR UPDATE`).                                                                   |
| `signals` (post_save, pre_delete)       | TypeORM `subscribers` / `@AfterInsert()`       | Django signals are global event hooks. TypeORM subscribers are entity-scoped. NestJS often prefers explicit service calls over implicit hooks.                                                                                |
| `django.test.TestCase`                  | Jest + `@nestjs/testing`                       | Django: built-in test client, transaction rollback per test. NestJS: Jest with `Test.createTestingModule()` for DI. Django's test infra is more batteries-included.                                                           |

**Interview tip:** When discussing architecture at Midi, map your NestJS mental model to Django terms. Say "serializer" not "DTO", "ViewSet" not "Controller", "Celery task" not "Bull job". Show you understand their stack even if your hands-on experience is TypeScript.

---

## Challenge 1: Insurance Eligibility via RAG Pipeline (45 minutes)

### Scenario

You are building the backend for Midi Health's insurance eligibility system. When a new patient signs up, they upload a photo of their insurance card. The system must:

1. **Extract card data** — OCR the insurance card image to extract payer name, plan ID, group number, and member information.
2. **Determine eligibility** — Cross-reference extracted plan info against Midi's knowledge base of payer contracts and plan benefit documents to determine if the patient's plan covers telehealth menopause care.
3. **Estimate costs** — Return expected copay, coinsurance, and deductible information based on the plan details.
4. **Handle uncertainty** — When OCR confidence is low or the plan isn't recognized, route to human review rather than giving a wrong answer.

The system must be HIPAA-compliant. Insurance card images contain PHI (Protected Health Information).

### Deliverables

Produce the following:

1. **System diagram** — Full pipeline from image upload to eligibility response, including async processing.
2. **Data model** — Entities for patients, payers, plans, plan documents, and eligibility checks.
3. **API design** — Endpoints for uploading cards, checking status, and retrieving results.
4. **RAG pipeline architecture** — Document ingestion, chunking strategy, embedding model, vector search, and LLM generation.
5. **Async processing strategy** — How you handle the delay between upload and result (OCR + RAG is not instant).
6. **Error handling** — Low-confidence OCR, unrecognized plans, LLM hallucination prevention.
7. **HIPAA considerations** — PHI handling, encryption, audit trails, access controls.
8. **Scalability notes** — What changes at 100K patients/month, 500 payer contracts.
9. **Trade-offs** — For each major decision, name an alternative and why you chose what you chose.

### Evaluation Criteria

| Dimension                  | What we look for                                                                                                                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RAG pipeline design**    | Clear separation of ingestion (offline) vs. query (online). Chunking strategy accounts for plan document structure. Retrieval includes metadata filtering (payer, state) before vector search. |
| **Async architecture**     | Image upload returns immediately with a job ID. Background worker processes OCR + RAG. Client polls or subscribes for result. Not a synchronous 30-second API call.                            |
| **Error handling depth**   | OCR confidence thresholds. Fallback to human review queue. LLM output validation (don't trust raw generation for coverage decisions). Structured output parsing.                               |
| **HIPAA awareness**        | PHI encrypted at rest and in transit. Audit log for all access. Images stored with encryption. LLM prompts don't leak PHI to third-party APIs (or uses BAA-covered AI service).                |
| **Trade-off articulation** | Every decision names an alternative. "We could do X, but Y is better here because Z."                                                                                                          |

---

### Reference Architecture (Answer Key)

#### System Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                              │
│                                                                      │
│  ┌─────────────────────┐         ┌────────────────────────────┐     │
│  │  Insurance Upload    │         │  Eligibility Results       │     │
│  │  (image + form data) │         │  (status, coverage, costs) │     │
│  └──────────┬──────────┘         └──────────▲─────────────────┘     │
└─────────────┼───────────────────────────────┼────────────────────────┘
              │  POST /api/eligibility/check   │  GET /api/eligibility/:id
              ▼                                │
┌──────────────────────────────────────────────────────────────────────┐
│                       NestJS Backend                                  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  EligibilityController                                         │  │
│  │  POST /api/eligibility/check → upload image, enqueue job       │  │
│  │  GET  /api/eligibility/:id   → return status + result          │  │
│  │  GET  /api/payers            → list supported payers           │  │
│  └────────────────────┬───────────────────────────────────────────┘  │
│                        │                                              │
│  ┌─────────────────────▼──────────────────────────────────────────┐  │
│  │  EligibilityService                                            │  │
│  │  → creates EligibilityCheck record (status: processing)        │  │
│  │  → uploads image to S3 (encrypted, private bucket)             │  │
│  │  → enqueues job to Bull/Redis queue                            │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  EligibilityProcessor (Bull queue worker)                      │  │
│  │                                                                │  │
│  │  Step 1: OCR ──────────────────────────────────────────────┐  │  │
│  │  │ Fetch image from S3                                     │  │  │
│  │  │ Call AWS Textract → extract text + confidence scores    │  │  │
│  │  │ Parse: payer name, plan ID, group #, member info        │  │  │
│  │  │ If confidence < threshold → status: needs_review        │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  Step 2: Plan Identification ──────────────────────────────┐  │  │
│  │  │ Match extracted payer name → Payer table (fuzzy match)  │  │  │
│  │  │ Match plan ID → InsurancePlan table                     │  │  │
│  │  │ If no match → attempt RAG lookup against plan docs      │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  Step 3: RAG Eligibility Determination ────────────────────┐  │  │
│  │  │ Filter plan documents by payer + state (metadata)       │  │  │
│  │  │ Vector search: "does [plan] cover telehealth            │  │  │
│  │  │   menopause care in [state]?"                           │  │  │
│  │  │ Top-k documents → LLM prompt with retrieved context     │  │  │
│  │  │ Structured output: { covered, copay, coinsurance,       │  │  │
│  │  │   deductible_applies, confidence, source_documents }    │  │  │
│  │  │ Validate LLM output against schema                      │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  Step 4: Store result → update EligibilityCheck record         │  │
│  └────────────────────────────────────────────────────────────────┘  │
└────────┬──────────────────────┬──────────────────────┬───────────────┘
         │                      │                      │
    ┌────▼────┐          ┌──────▼──────┐        ┌──────▼──────┐
    │ AWS S3  │          │ PostgreSQL  │        │ Redis       │
    │ (card   │          │ + pgvector  │        │ (Bull queue │
    │ images, │          │             │        │  broker)    │
    │ SSE-S3  │          │ Tables:     │        └─────────────┘
    │ encrypt)│          │ - patient   │
    └─────────┘          │ - payer     │
         │               │ - plan      │
    ┌────▼────┐          │ - plan_doc  │
    │ AWS     │          │ - plan_doc  │
    │ Textract│          │   _embedding│
    │ (OCR)   │          │ - eligibility│
    └─────────┘          │   _check    │
                         │ - audit_log │
                         └─────────────┘
```

#### Data Model

**Patient**

```
patient
├── id: UUID (PK, generated)
├── first_name: VARCHAR(255) NOT NULL
├── last_name: VARCHAR(255) NOT NULL
├── email: VARCHAR(255) UNIQUE NOT NULL
├── date_of_birth: DATE NOT NULL
├── state: VARCHAR(2) NOT NULL  -- patient's state of residence
├── is_active: BOOLEAN DEFAULT TRUE
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()

INDEX (email) -- login lookup
INDEX (state) -- state-based filtering
```

**Payer**

```
payer
├── id: UUID (PK, generated)
├── name: VARCHAR(255) NOT NULL  -- "Aetna", "BCBS", "Cigna"
├── display_name: VARCHAR(255) NOT NULL
├── is_active: BOOLEAN DEFAULT TRUE
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()

INDEX (name) -- lookup by extracted name
```

**InsurancePlan**

```
insurance_plan
├── id: UUID (PK, generated)
├── payer_id: UUID (FK → payer) NOT NULL
├── plan_name: VARCHAR(255) NOT NULL
├── plan_id_pattern: VARCHAR(100)  -- regex/pattern to match card plan IDs
├── plan_type: VARCHAR(20) NOT NULL  -- 'ppo', 'hmo', 'epo', 'pos'
├── covers_telehealth: BOOLEAN DEFAULT FALSE
├── covers_menopause_care: BOOLEAN DEFAULT FALSE
├── default_copay_cents: INTEGER  -- typical copay if known
├── default_coinsurance_pct: INTEGER  -- e.g., 20 for 20%
├── deductible_applies: BOOLEAN DEFAULT TRUE
├── states_covered: TEXT[]  -- array of state codes, empty = all states
├── is_active: BOOLEAN DEFAULT TRUE
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()

INDEX (payer_id)
INDEX (plan_type)
```

**PlanDocument** (for RAG knowledge base)

```
plan_document
├── id: UUID (PK, generated)
├── payer_id: UUID (FK → payer) NOT NULL
├── insurance_plan_id: UUID (FK → insurance_plan, nullable)  -- null = payer-wide doc
├── title: VARCHAR(500) NOT NULL
├── source_url: VARCHAR(1000)  -- where the doc came from
├── content: TEXT NOT NULL  -- full document text
├── state: VARCHAR(2)  -- if state-specific
├── document_type: VARCHAR(50) NOT NULL  -- 'benefit_summary', 'coverage_policy', 'provider_agreement'
├── effective_date: DATE
├── expiration_date: DATE
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()
```

**PlanDocumentChunk** (vector embeddings for RAG)

```
plan_document_chunk
├── id: UUID (PK, generated)
├── plan_document_id: UUID (FK → plan_document) NOT NULL
├── chunk_index: INTEGER NOT NULL  -- position within document
├── content: TEXT NOT NULL  -- chunk text
├── embedding: VECTOR(1536) NOT NULL  -- OpenAI ada-002 or similar
├── metadata: JSONB  -- { payer_id, plan_id, state, document_type }
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()

INDEX USING ivfflat (embedding vector_cosine_ops)  -- ANN search
INDEX (plan_document_id)
-- Metadata filtering via JSONB GIN index:
INDEX USING GIN (metadata)
```

**EligibilityCheck**

```
eligibility_check
├── id: UUID (PK, generated)
├── patient_id: UUID (FK → patient) NOT NULL
├── status: VARCHAR(20) NOT NULL DEFAULT 'processing'
│   -- 'processing', 'completed', 'needs_review', 'failed'
├── card_image_s3_key: VARCHAR(500) NOT NULL
├── ocr_raw_text: TEXT  -- raw OCR output
├── ocr_confidence: DECIMAL(5,4)  -- 0.0000 to 1.0000
├── extracted_payer_name: VARCHAR(255)
├── extracted_plan_id: VARCHAR(100)
├── extracted_group_number: VARCHAR(100)
├── extracted_member_id: VARCHAR(100)
├── matched_payer_id: UUID (FK → payer, nullable)
├── matched_plan_id: UUID (FK → insurance_plan, nullable)
├── is_eligible: BOOLEAN  -- null until determination
├── coverage_details: JSONB  -- { copay_cents, coinsurance_pct, deductible_applies, notes }
├── rag_confidence: DECIMAL(5,4)  -- LLM confidence in determination
├── source_document_ids: UUID[]  -- which plan docs were used
├── reviewed_by: UUID  -- FK to admin/staff if manually reviewed
├── reviewed_at: TIMESTAMPTZ
├── error_message: TEXT
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()

INDEX (patient_id, created_at DESC)  -- patient's eligibility history
INDEX (status)  -- needs_review queue
```

**AuditLog** (HIPAA requirement)

```
audit_log
├── id: UUID (PK, generated)
├── actor_id: UUID NOT NULL  -- user or system ID
├── actor_type: VARCHAR(20) NOT NULL  -- 'patient', 'clinician', 'system', 'admin'
├── action: VARCHAR(50) NOT NULL  -- 'view_card_image', 'run_eligibility', 'view_phi'
├── resource_type: VARCHAR(50) NOT NULL  -- 'eligibility_check', 'patient', 'card_image'
├── resource_id: UUID NOT NULL
├── ip_address: INET
├── metadata: JSONB  -- additional context
├── created_at: TIMESTAMPTZ DEFAULT NOW()

INDEX (resource_type, resource_id, created_at DESC)
INDEX (actor_id, created_at DESC)
-- Append-only: no UPDATE or DELETE allowed (enforced by DB trigger or RLS)
```

**Relationships:**

- Patient 1:N EligibilityCheck (a patient may check eligibility multiple times)
- Payer 1:N InsurancePlan (a payer offers many plans)
- Payer 1:N PlanDocument (a payer has many benefit documents)
- InsurancePlan 1:N PlanDocument (a plan may have specific documents)
- PlanDocument 1:N PlanDocumentChunk (a document is split into chunks for RAG)
- EligibilityCheck → Payer, InsurancePlan (matched after OCR)

#### API Design

```
POST   /api/eligibility/check   -- Upload card image + patient info, returns job ID
GET    /api/eligibility/:id     -- Poll for result (processing → completed/needs_review)
GET    /api/payers              -- List supported payers (for manual selection fallback)
GET    /api/plans?payer_id=X    -- List plans for a payer
```

**POST /api/eligibility/check**

```
// Request (multipart/form-data)
{
  "patient_id": "uuid",
  "card_image": <file>,            // JPEG/PNG of insurance card
  "state": "CA",                    // patient's state
  "payer_name_hint": "Aetna"       // optional: patient-provided payer name
}

// Response: 202 Accepted
{
  "id": "eligibility-check-uuid",
  "status": "processing",
  "created_at": "2026-03-01T10:00:00Z"
}
```

**GET /api/eligibility/:id**

```
// Response: 200 (when completed)
{
  "id": "eligibility-check-uuid",
  "status": "completed",
  "is_eligible": true,
  "extracted_info": {
    "payer_name": "Aetna",
    "plan_id": "PPO-Gold-2026",
    "group_number": "12345",
    "member_id": "W987654321"
  },
  "coverage": {
    "copay_cents": 3000,           // $30.00 copay per visit
    "coinsurance_pct": 20,         // 20% after deductible
    "deductible_applies": true,
    "notes": "Telehealth menopause care covered under behavioral health benefit"
  },
  "confidence": 0.92,
  "source_documents": ["doc-uuid-1", "doc-uuid-2"],
  "created_at": "..."
}

// Response: 200 (when needs review)
{
  "id": "eligibility-check-uuid",
  "status": "needs_review",
  "extracted_info": {
    "payer_name": "Aetna",
    "plan_id": null,               // could not extract
    "group_number": "12345",
    "member_id": null
  },
  "error_message": "Could not extract plan ID from card image. A care coordinator will verify your coverage before your first visit.",
  "created_at": "..."
}
```

#### RAG Pipeline Architecture

**Offline: Document Ingestion**

```
1. Acquire plan documents (PDFs, HTML from payer portals)
   → Download / scrape benefit summaries, coverage policies
   → Store raw files in S3

2. Parse and extract text
   → PDF: pdftotext or AWS Textract for complex layouts
   → HTML: DOM parsing, strip navigation/boilerplate

3. Chunk documents
   → Strategy: section-based chunking (split on headings + paragraph boundaries)
   → Target chunk size: 500-800 tokens
   → Overlap: 100 tokens between chunks
   → Preserve section headers as chunk metadata
   → Why section-based over fixed-size: insurance documents have clear structure
     (Section 4: Covered Services, Section 7: Exclusions). Splitting mid-section
     loses context.

4. Generate embeddings
   → Model: OpenAI text-embedding-ada-002 (or AWS Bedrock Titan)
   → Store in plan_document_chunk table with pgvector

5. Attach metadata to each chunk
   → { payer_id, insurance_plan_id, state, document_type, section_title }
   → Enables filtered vector search (search only Aetna PPO docs for California)
```

**Online: Eligibility Query**

```
1. Receive OCR-extracted plan info (payer name, plan ID, state)

2. Attempt direct database match
   → Query InsurancePlan by payer + plan_id_pattern
   → If exact match with known coverage data → return immediately (no RAG needed)
   → This handles the 80% case where we already know the plan

3. If no exact match → RAG query
   → Build query: "Does [payer] [plan type] cover telehealth menopause care
     including hormone replacement therapy in [state]?"
   → Filter: metadata.payer_id = matched_payer AND metadata.state IN (patient_state, null)
   → Vector search: top 5 chunks by cosine similarity
   → Minimum similarity threshold: 0.75 (below = low confidence)

4. LLM generation with retrieved context
   → System prompt: "You are an insurance coverage analyst. Based on the plan
     documents provided, determine coverage eligibility. Return ONLY valid JSON."
   → User prompt: retrieved chunks + patient's plan details + structured output schema
   → Model: GPT-4 or Claude (must be BAA-covered for HIPAA)
   → Parse structured output: { covered: bool, copay_cents, coinsurance_pct,
     deductible_applies, confidence: 0-1, reasoning: string }

5. Validate LLM output
   → Schema validation (all required fields present, types correct)
   → Confidence check: if LLM confidence < 0.7 → status: needs_review
   → Cross-check: if LLM says "not covered" but DB says plan covers telehealth → flag
   → Never return raw LLM output to the patient without validation
```

#### Async Processing Strategy

```
Patient uploads card
  → API returns 202 + eligibility_check_id immediately
  → Bull queue job enqueued: { eligibilityCheckId, s3Key, patientState }

Worker picks up job (within seconds)
  → OCR (2-5 seconds for Textract)
  → Plan matching (< 100ms for DB lookup)
  → RAG query if needed (2-4 seconds for embedding + search + LLM)
  → Total: 5-10 seconds typical

Frontend polls GET /api/eligibility/:id every 2 seconds
  → Or: WebSocket/SSE push when result is ready (better UX, more complex)
  → Or: optimistic UI showing "Checking your coverage..." with progress steps
```

**Why async over synchronous:** Textract OCR alone takes 2-5 seconds. Adding RAG makes it 5-10+ seconds. A synchronous API call would block the connection, risk timeouts behind load balancers (30s default), and can't be retried without re-uploading the image.

**Alternative considered:** Synchronous with a generous timeout. Simpler, but fails under load and can't show progress. WebSocket push is better UX but adds complexity. Polling is the pragmatic middle ground.

#### HIPAA Considerations

1. **Card images contain PHI** — member name, ID, date of birth may be visible

   - S3 bucket: private ACL, SSE-S3 encryption at rest, bucket policy denies unencrypted uploads
   - Access: presigned URLs with short TTL (5 min) for authorized access only
   - Retention: auto-delete after 30 days (or per retention policy)

2. **OCR text contains PHI** — extracted member info stored in eligibility_check table

   - Database: encrypted at rest (AWS RDS encryption)
   - Column-level encryption for sensitive fields (member_id, group_number) if needed
   - TLS for all connections (API ↔ DB, API ↔ S3, API ↔ Textract)

3. **LLM prompts may contain PHI** — plan details sent to AI model

   - Use BAA-covered AI service (AWS Bedrock with BAA, or Azure OpenAI with BAA)
   - Strip patient-identifying info from prompts (only send plan type + state, not member ID)
   - Log prompts and responses in audit_log (but redact PHI in logs)

4. **Audit trail** — HIPAA requires tracking who accessed what PHI and when

   - audit_log table is append-only (no UPDATE/DELETE)
   - Every card image view, eligibility result access, and admin review logged
   - Retention: 6 years minimum per HIPAA

5. **Access controls**
   - Patient can only see their own eligibility checks
   - Clinicians see eligibility status but not raw card images (minimum necessary)
   - Admin/care coordinators access needs_review queue with full details
   - All access gated by role-based guards

#### Scalability Notes

| Concern               | Trigger                           | Solution                                                                                                                                   |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| OCR throughput        | 10K+ uploads/day                  | Textract scales automatically. Batch API for bulk processing. Multiple Bull workers.                                                       |
| Vector search latency | 1M+ chunks in pgvector            | Switch to IVFFlat index → HNSW index. Or migrate to dedicated vector DB (Pinecone, Weaviate). Metadata pre-filtering reduces search space. |
| Embedding ingestion   | 1000s of new plan documents/year  | Batch embedding pipeline (nightly cron). Incremental updates — only re-embed changed documents.                                            |
| LLM cost              | High per-query cost at scale      | Cache common plan lookups (80% of checks are known plans — skip RAG entirely). Fine-tune smaller model on coverage determination task.     |
| Stale plan data       | Payer updates plan terms annually | Document freshness tracking (effective_date, expiration_date). Automated alerts when documents near expiration. Versioned embeddings.      |

#### Trade-offs

| Decision                        | Alternative                               | Rationale                                                                                                                                                           |
| ------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pgvector (PostgreSQL extension) | Pinecone / Weaviate (dedicated vector DB) | Fewer moving parts. Same database for relational and vector data. Sufficient at <1M chunks. Switch when search latency exceeds 100ms.                               |
| Section-based chunking          | Fixed-size (512 token) chunking           | Insurance documents have meaningful structure. Section-based preserves context about what is and isn't covered. Slightly more complex ingestion.                    |
| Bull queue (Redis) for async    | Celery (Python) / SQS (AWS)               | Bull is native to Node.js/NestJS. Redis already needed for caching. SQS is more durable but adds AWS coupling. In Django-land, Celery is the natural choice.        |
| AWS Textract for OCR            | Tesseract (open-source) / Google Vision   | Textract handles insurance cards well (structured data extraction). Tesseract is free but lower accuracy on cards. Google Vision is comparable but different cloud. |
| Polling for async results       | WebSocket / SSE push                      | Simpler to implement and debug. No connection state to manage. 2-second polling interval means <2s additional latency. WebSocket is better UX for production.       |
| Direct DB lookup before RAG     | Always RAG                                | 80% of patients have plans we already know. Skipping RAG for known plans is 100x faster and free (no LLM cost). RAG is the fallback, not the default path.          |
| Structured output parsing       | Free-text LLM response                    | Coverage decisions must be machine-readable (copay amount, boolean covered). Free-text requires another parsing step and is error-prone.                            |

---

## Challenge 2: Clinician Matching & Appointment Scheduling (45 minutes)

### Scenario

You are building the backend for Midi Health's clinician matching and scheduling system. When a patient completes onboarding, they fill out a health questionnaire describing their symptoms and goals. The system must:

1. **Questionnaire intake** — Patient submits symptoms (hot flashes, weight gain, mood changes, sleep issues, etc.) and care goals.
2. **Clinician matching** — System matches the patient to qualified clinicians based on: specialty alignment with symptoms, state licensure (clinician must be licensed in patient's state), and availability.
3. **Appointment booking** — Patient selects a time slot with a matched clinician. Only one patient can book a given slot — concurrent booking must be handled safely.
4. **Status tracking** — Both patient and clinician see appointment details and status (scheduled, completed, cancelled, no-show).

Clinicians practice across multiple states (telehealth). A clinician licensed in CA, NY, and TX can see patients in any of those states.

### Deliverables

Produce the following:

1. **System diagram** — Questionnaire → matching → scheduling → notification flow.
2. **Data model** — Entities for patients, clinicians, specialties, licenses, availability, appointments, questionnaires.
3. **API design** — Endpoints for questionnaire submission, clinician matching, and appointment booking.
4. **Matching algorithm** — How you rank and filter clinicians for a patient.
5. **Concurrency strategy** — How you prevent double-booking of appointment slots.
6. **Multi-state licensure** — How the data model and queries handle clinicians licensed in multiple states.
7. **EHR integration notes** — How appointment data syncs with AthenaOne (conceptual).
8. **Scalability notes** — What changes at 5000 clinicians, 50 states, 100K appointments/month.
9. **Trade-offs** — For each major decision, name an alternative and why you chose what you chose.

### Evaluation Criteria

| Dimension                   | What we look for                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain modeling**         | Entities reflect healthcare domain. Licensure is its own entity (not a string array). Availability is slot-based. Specialties are normalized. |
| **Matching sophistication** | Not just "random clinician in your state." Symptom → specialty mapping, availability weighting, load balancing across clinicians.             |
| **Concurrency handling**    | Specific mechanism for double-booking prevention. Understands the time-slot contention problem.                                               |
| **Licensure modeling**      | Many-to-many between clinicians and states. Licenses have expiration dates. Query correctly filters by patient's state.                       |
| **Pragmatism**              | Appropriate complexity. Matching doesn't need ML at this scale. Slot-based availability over calendar integration.                            |

---

### Reference Architecture (Answer Key)

#### System Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Next.js Frontend                              │
│                                                                      │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │ Questionnaire │  │ Clinician Browse │  │ Clinician Dashboard  │  │
│  │ (symptoms,    │  │ (matched list,   │  │ (schedule, upcoming  │  │
│  │  care goals)  │  │  book slot)      │  │  appointments)       │  │
│  └──────┬───────┘  └───────┬──────────┘  └──────────┬───────────┘  │
└─────────┼──────────────────┼────────────────────────┼───────────────┘
          │  REST (JSON)     │                        │
          ▼                  ▼                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       NestJS Backend                                  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Controllers                                                   │  │
│  │  POST /api/questionnaires         → submit symptoms            │  │
│  │  GET  /api/clinicians/match       → matched clinicians         │  │
│  │  GET  /api/clinicians/:id/slots   → available time slots       │  │
│  │  POST /api/appointments           → book slot (concurrency!)   │  │
│  │  GET  /api/appointments           → list appointments          │  │
│  │  PATCH /api/appointments/:id      → cancel/update status       │  │
│  │  GET  /api/patients               → list patients (seed data)  │  │
│  └──────────────────────┬─────────────────────────────────────────┘  │
│                          │                                            │
│  ┌───────────────────────▼────────────────────────────────────────┐  │
│  │  Services                                                      │  │
│  │                                                                │  │
│  │  QuestionnaireService                                          │  │
│  │  → submit(): store responses, map symptoms → specialties       │  │
│  │                                                                │  │
│  │  MatchingService                                               │  │
│  │  → matchClinicians(): filter by state + specialty + active     │  │
│  │     license, rank by availability count + rating               │  │
│  │                                                                │  │
│  │  AppointmentService                                            │  │
│  │  → book(): transaction + pessimistic lock on slot              │  │
│  │  → cancel(): restore slot availability                         │  │
│  │  → listForPatient(), listForClinician()                        │  │
│  └──────────────────────┬─────────────────────────────────────────┘  │
│                          │                                            │
│  ┌───────────────────────▼────────────────────────────────────────┐  │
│  │  TypeORM Repositories                                          │  │
│  │  Patient | Clinician | Specialty | StateLicense |              │  │
│  │  AvailabilitySlot | Appointment | HealthQuestionnaire          │  │
│  └──────────────────────┬─────────────────────────────────────────┘  │
└──────────────────────────┼────────────────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │       PostgreSQL        │
              │                         │
              │  Tables:                │
              │  - patient              │
              │  - clinician            │
              │  - specialty            │
              │  - clinician_specialty  │
              │  - state_license        │
              │  - availability_slot    │
              │  - appointment          │
              │  - health_questionnaire │
              │                         │
              │  Indexes, FKs,          │
              │  unique constraints     │
              └─────────────────────────┘
```

#### Data Model

**Patient**

```
patient
├── id: UUID (PK, generated)
├── first_name: VARCHAR(255) NOT NULL
├── last_name: VARCHAR(255) NOT NULL
├── email: VARCHAR(255) UNIQUE NOT NULL
├── date_of_birth: DATE NOT NULL
├── state: VARCHAR(2) NOT NULL  -- state of residence (for licensure matching)
├── is_active: BOOLEAN DEFAULT TRUE
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()
```

**Clinician**

```
clinician
├── id: UUID (PK, generated)
├── first_name: VARCHAR(255) NOT NULL
├── last_name: VARCHAR(255) NOT NULL
├── credential: VARCHAR(20) NOT NULL  -- 'NP', 'CNM', 'MD', 'ND'
├── bio: TEXT
├── years_experience: INTEGER
├── rating: DECIMAL(3,2)  -- 4.85 out of 5.00
├── max_patients_per_day: INTEGER DEFAULT 8
├── is_accepting_patients: BOOLEAN DEFAULT TRUE
├── is_active: BOOLEAN DEFAULT TRUE
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()
```

**Specialty**

```
specialty
├── id: UUID (PK, generated)
├── name: VARCHAR(100) NOT NULL UNIQUE  -- 'hrt', 'weight_glp1', 'mood', 'sleep', 'sexual_wellness', 'general_menopause'
├── display_name: VARCHAR(255) NOT NULL  -- 'Hormone Replacement Therapy', etc.
├── description: TEXT
└── created_at: TIMESTAMPTZ DEFAULT NOW()
```

**ClinicianSpecialty** (many-to-many)

```
clinician_specialty
├── clinician_id: UUID (FK → clinician) NOT NULL
├── specialty_id: UUID (FK → specialty) NOT NULL
├── is_primary: BOOLEAN DEFAULT FALSE  -- clinician's main focus
├── PRIMARY KEY (clinician_id, specialty_id)

INDEX (specialty_id)  -- find clinicians by specialty
```

**StateLicense**

```
state_license
├── id: UUID (PK, generated)
├── clinician_id: UUID (FK → clinician) NOT NULL
├── state: VARCHAR(2) NOT NULL  -- 'CA', 'NY', 'TX'
├── license_number: VARCHAR(100) NOT NULL
├── license_type: VARCHAR(50) NOT NULL  -- 'NP', 'MD', etc.
├── issued_date: DATE NOT NULL
├── expiration_date: DATE NOT NULL
├── is_verified: BOOLEAN DEFAULT FALSE
├── verified_at: TIMESTAMPTZ
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()

UNIQUE (clinician_id, state)  -- one license per state per clinician
INDEX (state, expiration_date)  -- find licensed clinicians in a state
CHECK (expiration_date > issued_date)
```

**AvailabilitySlot**

```
availability_slot
├── id: UUID (PK, generated)
├── clinician_id: UUID (FK → clinician) NOT NULL
├── start_time: TIMESTAMPTZ NOT NULL
├── end_time: TIMESTAMPTZ NOT NULL
├── is_booked: BOOLEAN DEFAULT FALSE
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()

UNIQUE (clinician_id, start_time)  -- no duplicate slots
INDEX (clinician_id, start_time, is_booked)  -- available slot search
INDEX (start_time, is_booked)  -- global availability search
CHECK (end_time > start_time)
```

**Appointment**

```
appointment
├── id: UUID (PK, generated)
├── patient_id: UUID (FK → patient) NOT NULL
├── clinician_id: UUID (FK → clinician) NOT NULL
├── slot_id: UUID (FK → availability_slot) UNIQUE NOT NULL  -- one appointment per slot
├── status: VARCHAR(20) NOT NULL DEFAULT 'scheduled'
│   -- 'scheduled', 'completed', 'cancelled', 'no_show'
├── visit_type: VARCHAR(50) DEFAULT 'initial_consultation'
│   -- 'initial_consultation', 'follow_up', 'urgent'
├── questionnaire_id: UUID (FK → health_questionnaire, nullable)
├── notes: TEXT  -- clinician notes after visit
├── cancelled_at: TIMESTAMPTZ
├── cancelled_by: VARCHAR(20)  -- 'patient', 'clinician', 'system'
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()

INDEX (patient_id, status, created_at DESC)  -- patient's appointments
INDEX (clinician_id, status, created_at DESC)  -- clinician's schedule
INDEX (slot_id) UNIQUE  -- enforces one appointment per slot
```

**HealthQuestionnaire**

```
health_questionnaire
├── id: UUID (PK, generated)
├── patient_id: UUID (FK → patient) NOT NULL
├── symptoms: TEXT[] NOT NULL  -- ['hot_flashes', 'weight_gain', 'mood_changes', 'sleep_issues', 'low_libido', 'brain_fog', 'hair_thinning']
├── severity: VARCHAR(20) NOT NULL  -- 'mild', 'moderate', 'severe'
├── care_goals: TEXT[] NOT NULL  -- ['hormone_therapy', 'weight_management', 'mood_support', 'sleep_improvement']
├── current_medications: TEXT[]
├── has_prior_hrt: BOOLEAN DEFAULT FALSE
├── menopause_stage: VARCHAR(30)  -- 'perimenopause', 'menopause', 'post_menopause'
├── additional_notes: TEXT
├── created_at: TIMESTAMPTZ DEFAULT NOW()
└── updated_at: TIMESTAMPTZ DEFAULT NOW()

INDEX (patient_id, created_at DESC)
```

**Relationships:**

- Patient 1:N HealthQuestionnaire (may update symptoms over time)
- Patient 1:N Appointment (books many appointments)
- Clinician N:M Specialty (via clinician_specialty junction table)
- Clinician 1:N StateLicense (licensed in multiple states)
- Clinician 1:N AvailabilitySlot (has many time slots)
- AvailabilitySlot 1:1 Appointment (at most one appointment per slot)
- Appointment → HealthQuestionnaire (optional link to intake)

#### API Design

```
POST   /api/questionnaires              -- Submit health questionnaire
GET    /api/clinicians/match             -- Get matched clinicians for a patient
GET    /api/clinicians/:id               -- Clinician detail with bio, specialties
GET    /api/clinicians/:id/slots         -- Available time slots for a clinician
POST   /api/appointments                 -- Book an appointment (concurrency-safe)
GET    /api/appointments                 -- List appointments (patient or clinician view)
PATCH  /api/appointments/:id             -- Cancel or update status
GET    /api/patients                     -- List patients (seed data)
```

**POST /api/questionnaires**

```json
// Request
{
  "patient_id": "uuid",
  "symptoms": ["hot_flashes", "weight_gain", "mood_changes"],
  "severity": "moderate",
  "care_goals": ["hormone_therapy", "weight_management"],
  "menopause_stage": "perimenopause"
}

// Response: 201
{
  "id": "questionnaire-uuid",
  "patient_id": "uuid",
  "symptoms": ["hot_flashes", "weight_gain", "mood_changes"],
  "matched_specialties": ["hrt", "weight_glp1", "mood"],
  "created_at": "..."
}
```

**GET /api/clinicians/match?patient_id=X&questionnaire_id=Y**

```json
// Response: 200
[
	{
		"id": "clinician-uuid",
		"name": "Dr. Sarah Chen, NP",
		"credential": "NP",
		"specialties": ["hrt", "weight_glp1"],
		"matching_specialties": ["hrt", "weight_glp1"], // overlap with patient needs
		"match_score": 0.85,
		"years_experience": 12,
		"rating": 4.9,
		"available_slot_count": 8,
		"next_available": "2026-03-05T10:00:00Z",
		"bio": "Board-certified NP specializing in..."
	},
	{
		"id": "clinician-uuid-2",
		"name": "Dr. Maria Lopez, MD",
		"credential": "MD",
		"specialties": ["hrt", "mood", "sleep"],
		"matching_specialties": ["hrt", "mood"],
		"match_score": 0.72,
		"years_experience": 20,
		"rating": 4.8,
		"available_slot_count": 3,
		"next_available": "2026-03-07T14:00:00Z",
		"bio": "..."
	}
]
```

**POST /api/appointments**

```json
// Request
{
  "patient_id": "uuid",
  "clinician_id": "uuid",
  "slot_id": "slot-uuid",
  "questionnaire_id": "questionnaire-uuid",
  "visit_type": "initial_consultation"
}

// Success: 201
{
  "id": "appointment-uuid",
  "patient_id": "uuid",
  "clinician_id": "uuid",
  "clinician_name": "Dr. Sarah Chen, NP",
  "start_time": "2026-03-05T10:00:00Z",
  "end_time": "2026-03-05T10:30:00Z",
  "status": "scheduled",
  "visit_type": "initial_consultation"
}

// Error: 409 (slot already booked)
{ "statusCode": 409, "message": "This time slot is no longer available" }

// Error: 400 (clinician not licensed in patient's state)
{ "statusCode": 400, "message": "Clinician is not licensed to practice in CA" }
```

#### Matching Algorithm

```
matchClinicians(patientId, questionnaireId):

  1. Load patient → get state
  2. Load questionnaire → map symptoms/goals to specialties
     Mapping:
       hot_flashes, hormone_therapy → 'hrt'
       weight_gain, weight_management → 'weight_glp1'
       mood_changes, mood_support → 'mood'
       sleep_issues, sleep_improvement → 'sleep'
       low_libido → 'sexual_wellness'
       (unmapped symptoms) → 'general_menopause'

  3. Filter clinicians:
     WHERE is_active = TRUE
       AND is_accepting_patients = TRUE
       AND EXISTS (
         SELECT 1 FROM state_license
         WHERE clinician_id = clinician.id
           AND state = patient.state
           AND expiration_date > NOW()
           AND is_verified = TRUE
       )
       AND EXISTS (
         SELECT 1 FROM clinician_specialty
         WHERE clinician_id = clinician.id
           AND specialty_id IN (matched_specialty_ids)
       )

  4. Rank results:
     match_score = (
       0.5 * (matching_specialties_count / total_needed_specialties) +
       0.2 * (available_slot_count / max_available) +
       0.2 * (rating / 5.0) +
       0.1 * min(years_experience / 20, 1.0)
     )

  5. Return top 10, ordered by match_score DESC
```

**Why this ranking over simpler approaches:** Pure specialty match ignores availability (a perfect specialist with no openings for 3 weeks is less useful than a good generalist available tomorrow). The weighted score balances clinical fit with practical availability.

**Alternative considered:** ML-based matching (collaborative filtering from past appointment outcomes). Overkill at <5000 clinicians. The deterministic algorithm is explainable, debuggable, and sufficient. ML could optimize later with outcome data.

#### Concurrency Strategy — Appointment Booking

The core concurrency problem: two patients click "Book" on the same time slot at the same instant.

**Approach: Pessimistic locking with `SELECT ... FOR UPDATE` on the availability slot**

```sql
BEGIN;
  SELECT * FROM availability_slot
    WHERE id = $1 AND is_booked = FALSE
    FOR UPDATE;
  -- If no row returned → slot doesn't exist or is already booked → abort with 409

  -- Validate licensure
  SELECT * FROM state_license
    WHERE clinician_id = $2 AND state = $3
      AND expiration_date > NOW() AND is_verified = TRUE;
  -- If no row → clinician not licensed in patient's state → abort with 400

  INSERT INTO appointment (patient_id, clinician_id, slot_id, ...)
    VALUES ($4, $2, $1, ...);

  UPDATE availability_slot SET is_booked = TRUE, updated_at = NOW()
    WHERE id = $1;
COMMIT;
```

Same pattern as the shift booking in the Clipboard challenge — `FOR UPDATE` lock on the slot row. Second transaction waits, then sees `is_booked = TRUE` and gets 409.

**Why slot-based over calendar math:** Pre-defined slots are simpler to lock and query than computing availability from appointment windows. Each slot is an atomic lockable row. Trade-off: clinician or admin must create slots in advance.

**Alternative considered:** Optimistic locking (version column on slot). Viable but requires client-side retry logic. Not worth the complexity at this contention level.

#### Multi-State Licensure

The `state_license` table is a separate entity, not a string array on the clinician:

```
clinician (id: 1, name: "Dr. Chen")
  ├── state_license (state: CA, expires: 2027-01-15, verified: true)
  ├── state_license (state: NY, expires: 2026-08-30, verified: true)
  └── state_license (state: TX, expires: 2026-12-01, verified: true)
```

**Why a separate table over `states: TEXT[]`:**

- Licenses have attributes (expiration date, license number, verification status)
- Expired licenses must be filtered out at query time (`expiration_date > NOW()`)
- Unverified licenses should not be used for matching
- A string array can't capture this — you'd need a parallel array of dates, which is fragile

**Query pattern:**

```sql
-- Find clinicians for a patient in California with HRT specialty
SELECT c.*, COUNT(DISTINCT s.id) as matching_specialty_count
FROM clinician c
JOIN state_license sl ON sl.clinician_id = c.id
  AND sl.state = 'CA'
  AND sl.expiration_date > NOW()
  AND sl.is_verified = TRUE
JOIN clinician_specialty cs ON cs.clinician_id = c.id
JOIN specialty s ON s.id = cs.specialty_id
  AND s.name IN ('hrt', 'weight_glp1')
WHERE c.is_active = TRUE
  AND c.is_accepting_patients = TRUE
GROUP BY c.id
ORDER BY matching_specialty_count DESC, c.rating DESC;
```

#### EHR Integration Notes (Conceptual)

Midi uses AthenaOne (Athenahealth). In production, appointment data would sync:

```
Appointment booked in Midi
  → Create Appointment resource in AthenaOne (FHIR R4 or Athena proprietary API)
  → Push: patient demographics, appointment time, clinician, visit type
  → AthenaOne returns: appointment ID, video link (if Athena handles telehealth)

After visit:
  → Clinician documents in AthenaOne (encounter notes, prescriptions)
  → Midi pulls: encounter status, care plan updates
  → Sync is event-driven (FHIR Subscriptions or polling Athena changelog API)
```

**For POC scope:** No actual EHR integration. Note in architecture that the AppointmentService has a hook point (`afterBooking()`) where EHR sync would plug in.

#### Scalability Notes

| Concern                        | Trigger                                    | Solution                                                                                                                                                                                              |
| ------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Matching query latency         | 5000+ clinicians, 50 states                | Composite indexes on `state_license(state, expiration_date, is_verified)` and `clinician_specialty(specialty_id)`. Materialized view of "active clinicians per state per specialty" refreshed hourly. |
| Slot search throughput         | 100K+ slots per week                       | Partition `availability_slot` by month. Index on `(clinician_id, start_time, is_booked)`. Archive past slots.                                                                                         |
| Appointment booking contention | Popular clinician, many patients           | Pessimistic locking is per-slot, not global. Contention is low (2-3 patients competing for same slot, not 10,000). Scale horizontally with read replicas for matching queries.                        |
| Multi-timezone scheduling      | Patients + clinicians across US time zones | Store all times as TIMESTAMPTZ (UTC). Frontend converts to local time. Clinician sets availability in their local time, converted to UTC on save.                                                     |
| Notification fan-out           | Appointment reminders, cancellation alerts | Extract to async worker (Bull queue). Email/SMS via SendGrid/Twilio. Don't block the booking response on notification delivery.                                                                       |

#### Trade-offs

| Decision                       | Alternative                             | Rationale                                                                                                                                                                             |
| ------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-defined availability slots | Calendar-based free/busy calculation    | Slots are lockable rows — simple concurrency model. Calendar math requires computing availability from existing appointments + working hours, which is complex and harder to lock.    |
| Separate StateLicense entity   | `licensed_states: TEXT[]` on clinician  | Licenses have attributes (expiration, verification, license number). A string array loses this. The join cost is negligible.                                                          |
| Weighted scoring for matching  | Simple filter + random / round-robin    | Patients get better matches (specialty fit + availability). Round-robin ignores clinical fit. ML-based matching is premature at this scale.                                           |
| Pessimistic locking on slots   | Optimistic locking (version column)     | Low contention per-slot. Simpler — no retry loops. Same proven pattern as shift booking.                                                                                              |
| Slot-based 30-min increments   | Flexible duration appointments          | Uniform slots simplify scheduling UI and concurrency. Follow-ups could be shorter but 30-min slots are standard for telehealth. Add appointment types with different durations later. |
| REST API                       | GraphQL                                 | Fixed set of endpoints with known queries. Matching endpoint returns a defined shape. GraphQL adds value when frontend needs vary significantly across views.                         |
| TIMESTAMPTZ for all times      | Separate date + time + timezone columns | PostgreSQL TIMESTAMPTZ handles timezone conversion correctly. One column, not three. Frontend converts for display.                                                                   |

---

## Evaluation Rubric

### Challenge 1: Insurance Eligibility (RAG Pipeline)

| Score      | Description                                                                                                                                                                                                                                                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Strong** | Clear separation of offline ingestion vs. online query. Async processing with job queue (not synchronous). Metadata-filtered vector search (not searching all documents). LLM output validation (structured output, confidence thresholds, fallback to human review). HIPAA considerations specific and actionable. 3+ trade-offs with alternatives. |
| **Solid**  | Correct RAG pipeline flow. Mentioned async processing. Some HIPAA awareness. At least 2 trade-offs. May have gaps in error handling or document ingestion strategy.                                                                                                                                                                                  |
| **Weak**   | Synchronous API call for OCR + RAG. No confidence thresholds or fallback. Vague on HIPAA ("encrypt everything"). No document ingestion strategy.                                                                                                                                                                                                     |
| **Miss**   | No async processing. Trusts raw LLM output for coverage decisions. No HIPAA consideration. No understanding of the two-phase (ingestion vs. query) RAG architecture.                                                                                                                                                                                 |

### Challenge 2: Clinician Matching & Scheduling

| Score      | Description                                                                                                                                                                                                                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Strong** | Licensure modeled as a separate entity with expiration dates. Matching includes specialty overlap + availability + ranking. Slot-based availability with pessimistic locking for booking. Clear distinction between matching (read-heavy) and booking (write + lock). 3+ trade-offs. EHR integration hook mentioned. |
| **Solid**  | Correct data model with licensure. Reasonable matching logic. Mentioned concurrency for booking. At least 2 trade-offs. May miss license expiration or availability as a ranking signal.                                                                                                                             |
| **Weak**   | Licensure as a string array. No concurrency strategy for booking. Matching is just "filter by state." No availability modeling.                                                                                                                                                                                      |
| **Miss**   | No licensure modeling. Business logic in controllers. No concurrency awareness. Can't articulate the matching algorithm.                                                                                                                                                                                             |
