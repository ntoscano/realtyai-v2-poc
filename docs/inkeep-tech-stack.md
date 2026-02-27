# Inkeep — Technology & Architecture Reference

> Background knowledge for interview prep. This doc covers Inkeep's internal systems and stack.
> For interview strategy and how to architect an AI app, see [inkeep-interview-prep.md](./inkeep-interview-prep.md).

---

## 1. Tech Stack

| Layer                 | Technology                                                               |
| --------------------- | ------------------------------------------------------------------------ |
| **Language**          | TypeScript (94% of codebase)                                             |
| **Frontend**          | React, Radix UI primitives, Tailwind CSS + CVA (migrated from Chakra UI) |
| **Build**             | pnpm monorepo, tsdown, vitest                                            |
| **Vector DB**         | Milvus                                                                   |
| **Sparse embeddings** | BM25, SPLADE, BGE-M3                                                     |
| **Dense embeddings**  | MS-MARCO, MPNET, BGE-M3                                                  |
| **Reranking**         | Weighted scoring + Reciprocal Rank Fusion (RRF)                          |
| **LLM providers**     | OpenAI, Anthropic                                                        |
| **API format**        | OpenAI-compatible chat completions                                       |
| **Observability**     | OpenTelemetry distributed tracing                                        |
| **Protocols**         | MCP (Model Context Protocol), A2A (Agent-to-Agent), Vercel AI SDK        |
| **Deployment**        | Docker, Vercel, self-hosted option                                       |

---

## 2. Monorepo Structure

The main repo is `inkeep/agents` (963 stars on GitHub):

```
agents-api/        — REST API (config, state, traces)
agents-manage-ui/  — Visual drag-and-drop agent builder
agents-sdk/        — TypeScript SDK (@inkeep/agents-sdk)
agents-cli/        — CLI tools (push/pull 2-way sync)
agents-ui/         — Chat UI component library
agents-docs/       — Documentation
```

---

## 3. Widget Architecture Evolution

### The problem

The original widget (`@inkeep/widgets`) was 5.6MB — Chakra UI for styling, Apollo/GraphQL for data, plus all the transitive dependencies. Loading 5.6MB on a customer's docs page was unacceptable.

### The solution: layered component architecture

New widget (`@inkeep/cxkit-react`) is **101.9 KB**. Achieved via a strict layered pattern:

```
cxkit-types       → pure TS types, zero dependencies
     ↓
cxkit-primitives  → headless, unstyled components (state + accessibility only)
     ↓
cxkit-styled      → Tailwind + CVA styling applied to primitives
     ↓
cxkit-react       → consumer-facing React components (composed from styled)
     ↓
cxkit-docusaurus  → framework-specific wrappers (thin adapter layer)
```

**Key design decisions:**

| Decision               | Implementation                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Bundle size**        | Tree-shakeable. Each layer is independently importable. Customer only pays for what they use.                                              |
| **SSR**                | Components handle no-`window`. Dynamic imports in Next.js, `<BrowserOnly>` in Docusaurus. Render nothing server-side, hydrate client-side. |
| **Theming**            | Single `primaryBrandColor` prop → derive entire palette via HSL manipulation. Accessible contrast ratios computed automatically.           |
| **State**              | Controlled/uncontrolled pattern via `useControllableState`. Imperative handles via `ref` for `submitMessage()`, `clearChat()`, etc.        |
| **Streaming**          | SSE connection to backend. Parse streaming chunks, render incrementally. Handle reconnection and error states.                             |
| **Framework wrappers** | Core is framework-agnostic React. Thin wrappers for Docusaurus, vanilla JS snippet for non-React sites.                                    |

---

## 4. RAG Pipeline Architecture

This is Inkeep's core product — a multi-tenant retrieval-augmented generation pipeline.

### End-to-end flow

```
[Sources] → [Connectors] → [Chunking] → [Embedding] → [Vector DB (Milvus)]
                                                              ↓
[User Query] → [Query Understanding] → [Hybrid Search] → [Rerank] → [LLM + Citations]
```

### Pipeline stages

| Stage          | What it does                                                                                                                                                                                             | Key decisions                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Ingestion**  | Plugin-based source connectors. Each implements `listDocuments()`, `fetchDocument()`, `detectChanges()`. Webhooks for GitHub/Discord, polling + ETags for web.                                           | JS-rendered pages handled via browser simulation (Puppeteer/Playwright). |
| **Chunking**   | Hierarchical decomposition preserving document structure. Different strategies per content type: prose (semantic paragraphs), API refs (per-endpoint), code (per-function). 256-512 tokens with overlap. | Preserve parent/child/sibling metadata for context reconstruction.       |
| **Embedding**  | Dual approach: sparse (BM25/SPLADE for keyword precision) + dense (MS-MARCO/BGE for semantic understanding). Both generated at ingestion time.                                                           | Short queries (<5 words) → sparse wins. Long queries → dense wins.       |
| **Storage**    | Milvus with tenant isolation. Partition-per-tenant for mid-tier, collection-per-tenant for enterprise. Tenant ID on every chunk's metadata.                                                              | Index types: HNSW for low-latency, FLAT for small collections.           |
| **Retrieval**  | Parallel sparse + dense search. Metadata filtering (source type, date range, record type). Top-k per method.                                                                                             | Two parallel searches merged via RRF.                                    |
| **Reranking**  | Two options: weighted scoring (60% dense / 40% sparse) or RRF. Cross-encoder reranker for final precision.                                                                                               | RRF formula: `score = Σ 1/(k + rank_i)` where k=60.                      |
| **Generation** | Feed top-N chunks + query to LLM. Citation linking via metadata URLs. Confidence scoring — only answer when retrieval quality is high enough.                                                            | Streaming via SSE. "I don't know" is better than hallucination.          |

### Multi-tenancy decisions

- **Tenant isolation in vector DB:** partition vs. collection vs. metadata filter (tradeoff: isolation strength vs. operational complexity)
- **Per-tenant embedding model selection:** some customers need domain-specific models
- **Rate limiting and token budgets:** per tenant
- **Data freshness SLAs:** how fast do doc updates appear in search? (GitHub webhook = near-instant, web crawl = hours)

---

## 5. Multi-Agent Orchestration

### Architecture

```
[User Query] → [Router/Main Agent]
                    ├── [Docs Agent]       → RAG pipeline → cited answer
                    ├── [Support Agent]    → Zendesk API → ticket creation
                    ├── [Actions Agent]    → MCP tools → API calls
                    └── [Escalation Agent] → human handoff
```

### Key concepts

- **Graph-based orchestration** — agents as nodes in a directed graph, edges define handoff logic
- **Natural language routing** — LLM classifies user intent to select the right sub-agent (not if/else trees)
- **MCP for tool use** — each external system (Zendesk, Linear, GitHub) exposed as an MCP server
- **Conversation state** — persisted across agent handoffs. Full OpenTelemetry trace per conversation
- **Agent Rule System** — institutional knowledge captured from resolved tickets, applied as rules to guide agent behavior
- **Guardrails** — PII removal, toxicity filtering, confidence thresholds

### SDK pattern

```typescript
const supportAgent = subAgent({
	id: 'support-agent',
	name: 'Support Agent',
	canUse: () => [ragMcp, zendeskMcp],
	prompt: `You are a support agent...`,
});

export const mainAgent = agent({
	id: 'main-agent',
	defaultSubAgent: supportAgent,
	subAgents: () => [supportAgent, escalationAgent],
});
```

### 2-way sync (their killer feature)

Code changes sync to the visual builder and vice versa. `inkeep push` / `inkeep pull` CLI commands. Non-technical teams edit agent behavior in the UI; engineers edit in TypeScript. Both stay in sync.

**Why it matters:** The support manager needs to tweak the agent's personality without filing a ticket to engineering. The engineer needs to add a complex MCP tool without breaking the manager's config. 2-way sync serves both personas from a single source of truth.

---

## 6. Content Ingestion Pipeline

### Architecture

```
[Webhook/Poll] → [Crawl Queue] → [Content Extraction] → [Diff Detection]
    → [Re-chunk changed sections only] → [Re-embed] → [Update vector DB]
```

### Source types

Documentation sites (Docusaurus, ReadMe, GitBook, Mintlify), Notion, Confluence, SharePoint, Slack, Discord, Discourse, GitHub issues/discussions, Stack Overflow, OpenAPI specs, GraphQL specs, PDF, Markdown, CSV, YouTube.

### Key decisions

- **Incremental re-indexing:** don't re-embed millions of chunks for one page change. Diff detection identifies changed sections and only re-processes those.
- **Content quality signals:** employee/moderator responses weighted higher in search results. AI-generated answers excluded from the training corpus to prevent model collapse.
- **Hierarchical metadata preservation:** breadcrumbs, parent sections, and document structure preserved through chunking so answers can cite specific sections.
- **Browser simulation:** JS-rendered documentation sites (SPAs) require headless browser rendering before content extraction.

---

## 7. PostHog Case Study Highlights

PostHog is one of Inkeep's flagship customers. Key metrics and insights:

- **33% auto-resolution rate** — one-third of user questions answered without human intervention
- **Content quality signals** — PostHog staff responses weighted higher; community responses from verified team members get priority
- **Content gap identification** — questions users ask that docs don't answer get flagged for the docs team, creating a feedback loop
- **Multi-source integration** — docs, GitHub issues, community forums, and Slack all indexed and searchable through a single interface
- **The 67% insight** — 67% of queries still need human support. The system's job is to _know which is which_ (confidence scoring) and route accordingly. Forcing AI answers on low-confidence queries destroys trust faster than not having AI at all.

---

## 8. Key Concepts to Understand

For each concept: what it is, why it matters, and how it connects to the tictactoe project.

---

**Streaming (SSE)**

_What:_ Server-Sent Events — the server sends chunks as they're generated over a single HTTP connection, and the client renders incrementally. Unlike WebSockets, SSE is unidirectional (server → client), simpler, and works over HTTP/2.

_Why it matters:_ LLMs are slow (2-10 seconds for a full response). Without streaming, the user stares at a spinner for the entire duration. With streaming, they see text appear word-by-word, which feels faster even if total time is identical. This is a UX principle called "progressive disclosure of progress."

_Connection to tictactoe:_ Your app doesn't stream — the AI returns a single number, so there's nothing to stream incrementally. But if the interview task is "build a chat widget," you'd need streaming via Vercel AI SDK's `streamText()` + `useChat()`. Inkeep's entire chat interface is built on this pattern.

---

**Hybrid search (sparse + dense embeddings)**

_What:_ Running two search algorithms in parallel and merging results. **Sparse embeddings** (BM25, SPLADE) match exact keywords — "CORS error" finds documents containing those exact words. **Dense embeddings** (sentence-transformers, BGE-M3) match semantic meaning — "how to fix cross-origin issues" finds relevant docs even without the exact words "CORS error."

_Why it matters:_ Neither alone is sufficient. Short, specific queries like error messages need keyword precision (sparse wins). Long, conceptual queries need semantic understanding (dense wins). Running both and merging covers both cases.

_Connection to tictactoe:_ Your project doesn't do search. But if they ask you to design a docs search system, this is the retrieval architecture. Inkeep uses Milvus for vector storage and runs sparse + dense in parallel at query time.

---

**Reciprocal Rank Fusion (RRF)**

_What:_ An algorithm that merges two ranked lists into one. Each item scores `1/(k + rank)` in each list (k is typically 60). Items appearing in both lists get their scores summed, so they naturally rise to the top. Items in only one list still appear, but ranked lower.

_Why it matters:_ It's simple, works well across different scoring scales, and doesn't need parameter tuning (k=60 is nearly universal). It solves the problem of "how do I combine results from two systems that use completely different scoring?"

_Connection to tictactoe:_ Not directly relevant. But when whiteboarding a RAG pipeline, you'll need to explain how sparse and dense retrieval results get merged. RRF is the standard answer.

---

**Headless components**

_What:_ Components that manage state, accessibility, and keyboard interactions but render nothing visible. The consumer provides all the visuals. Radix UI primitives are headless — `Dialog.Root` manages open/close state and focus trapping, but has zero CSS.

_Why it matters:_ Separation of behavior from appearance. Enables tiny bundle sizes because unused styles aren't shipped. Any customer can theme the component to match their brand without fighting pre-applied styles. This is how Inkeep went from 5.6MB (Chakra — opinionated styles baked in) to 101KB (Radix headless + Tailwind on top).

_Connection to tictactoe:_ Your `Cell` component is NOT headless — it includes Tailwind styles directly. But if you were building an embeddable widget (like Inkeep's chat), you'd split it: a headless `Cell` primitive that manages click handling + disabled state, and a styled wrapper that applies the visuals.

---

**CVA (class-variance-authority)**

_What:_ A utility that maps component variant props to Tailwind classes declaratively. Instead of `className={isLarge ? "h-12" : "h-10"}` ternaries scattered through your JSX, you define a variant map once and get type-safe variant props.

_Why it matters:_ Type-safe variants (TypeScript catches `size="xtra-large"` as an error). Single source of truth for all styling combinations. Composable with `cn()` (typically `clsx` + `tailwind-merge`) for conditional class merging. This is the styling pattern Inkeep standardized on for `cxkit-styled`.

_Connection to tictactoe:_ Your project uses shadcn/ui components (Button, Card, Badge, ScrollArea), which are built with CVA internally. In the implementation round, you should be able to write a CVA definition from scratch.

---

**MCP (Model Context Protocol)**

_What:_ A standard protocol for LLMs to call external tools. Each tool exposes an MCP server with a typed interface. Any MCP-compatible agent can discover and use any MCP tool. Think of it as USB for AI — one protocol, infinite tools.

_Why it matters:_ Instead of writing custom integrations for every external system (Zendesk, GitHub, Linear), you expose each as an MCP server once. Any agent can use it. When a new AI framework comes along, your tools still work. Inkeep uses MCP for their Actions Agent — external API calls go through MCP tools.

_Connection to tictactoe:_ Your project doesn't use MCP. But if asked "how would you add the ability for your AI to query a database or call an API?", MCP is the answer for a production system. For a tictactoe game, a simple function call suffices.

---

**Controlled vs. uncontrolled components**

_What:_ **Controlled** = parent owns the state via props (`value` + `onChange`). The component renders what the parent tells it to. **Uncontrolled** = component owns its own state internally (`defaultValue`). The parent doesn't manage state at all. Radix's `useControllableState` supports both modes in the same component.

_Why it matters:_ Library components need to work both ways. Some consumers want full control (form libraries, complex state management). Others want sensible defaults with zero configuration. The `useControllableState` pattern detects whether `value` is provided — if so, controlled mode; if not, uncontrolled with `defaultValue`.

_Connection to tictactoe:_ Your `GameBoard` is effectively controlled — `page.tsx` owns the board state and passes it down as a prop. But your project doesn't need to support both modes because you're not building a library. If Inkeep asks you to build a component that external developers embed, you'd reach for this pattern.
