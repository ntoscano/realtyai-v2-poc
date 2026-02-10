# AI/LLM Interview Prep: RealtyAI & Weller Labs

Based on the architectures documented in:

- `apps/realty-ai/docs/ai-email-generation-architecture.md` (RealtyAI - LangGraph pipeline)
- `references/wellerlabs/docs/ai-content-generation-architecture.md` (Weller Labs - Vercel AI SDK)

---

## 1. "How did you manage evals in your previous project?"

Neither project uses a dedicated eval framework (no LangSmith, Promptfoo, Braintrust), so be honest about that but frame what you _did_ do, which is actually substantive:

### Answer Framework

"We didn't use a dedicated eval framework, but we had evaluation built into the system at multiple layers:

**Structural validation** (Weller Labs) - We used Zod schemas as output validators. Every LLM generation call went through `generateObject()` from the Vercel AI SDK, which validates the output against a Zod schema _during generation_. If the schema validation fails, we had `experimental_repairText` callbacks that attempt auto-repair, plus retry loops with exponential backoff. So the system self-evaluated structural correctness.

**Generation test suites** (Weller Labs) - We had dedicated `.gen.test.ts` files that were separate from unit tests. These ran actual LLM generation calls against real prompts and validated the outputs programmatically - checking structure, field presence, content length constraints. They were slow to run (real API calls) so we kept them separate from fast unit tests.

**Post-processing constraints** (RealtyAI) - In the LangGraph pipeline, we had a dedicated `postProcessingNode` that enforced business rules on LLM output (e.g., 300-word limit). This acted as a quality gate after generation.

**Graceful degradation as implicit eval** - If the LLM output couldn't be parsed (regex parsing for SUBJECT/BODY markers failed), the system fell back to a default email rather than passing garbage to the user. The fallback rate was itself a signal of generation quality.

If I were to evolve this, I'd add: prompt regression tests (golden input/output pairs), human preference scoring on generated emails, and integration with something like Braintrust or LangSmith for tracing and comparison across prompt iterations."

### Key Files to Reference

- `references/wellerlabs/packages/data/src/schemas/program-schema.ts` - Zod schemas with `.describe()` for AI guidance
- `references/wellerlabs/packages/data/src/tools/__tests__/*.gen.test.ts` - Generation test suites
- `references/wellerlabs/packages/data/src/tools/generate-program-outline.ts` - Retry/repair logic
- `apps/realty-ai/src/lib/ai/nodes.ts` - `postProcessingNode` (word limit enforcement), `parseEmailResponse` (fallback on parse failure)

---

## 2. "Tell me about your experience with function calling and how it works"

You have a nuanced answer here because you've worked with **both sides** of the function calling coin:

### Answer Framework

"I've worked with structured output and tool use in two different paradigms:

**Vercel AI SDK approach** (Weller Labs) - We used `generateObject()` and `streamObject()` which leverage the model's function calling capability under the hood. You define a Zod schema, and the SDK tells the model to output JSON conforming to that schema. The model uses its structured output / tool_use capability to guarantee valid JSON. For example, our `ProgramOutlineSchema` defined nested structures (chapters containing lessons containing pages), and the model would generate a complete, valid hierarchy in a single call. The SDK handles the function calling protocol transparently - you work with Zod schemas, it handles the `tool_use` content blocks.

**LangChain/LangGraph approach** (RealtyAI) - Here I used `ChatBedrockConverse` from `@langchain/aws` with `ChatPromptTemplate`. Instead of structured output, we used a text-based approach where the model outputs free text with markers (SUBJECT: / BODY:) and we parse with regex. I chose this for simplicity in an MVP, but the trade-off is fragility - if the model doesn't follow the format, you need fallbacks. LangChain supports `.withStructuredOutput()` which would have given us the same schema-validated output.

**How function calling works at the protocol level**: The model receives a `tools` parameter describing available functions with JSON Schema definitions. When the model decides to use a tool, it returns a `tool_use` content block with the function name and arguments (valid JSON matching the schema). The client executes the function and sends back a `tool_result`. For structured output specifically, there's typically a single tool whose schema _is_ the desired output format, so the model is forced to produce conformant JSON.

**The key trade-off**: Function calling gives you structural guarantees but costs slightly more tokens and latency. Free text parsing is simpler and faster but requires fallback handling. In production, I'd always choose structured output for anything that feeds into downstream systems."

### Key Files to Reference

- `references/wellerlabs/packages/data/src/tools/generate-program-outline.ts` - `generateObject()` with Zod schemas
- `references/wellerlabs/packages/data/src/tools/generate-program-lesson.ts` - `generateObject()` with repair callbacks
- `references/wellerlabs/packages/data/src/schemas/` - Comprehensive Zod schema hierarchy
- `apps/realty-ai/src/lib/ai/nodes.ts` - Regex-based text parsing approach (`parseEmailResponse`)
- `apps/realty-ai/src/lib/ai/emailPrompt.ts` - `ChatPromptTemplate` with structured output instructions in the prompt itself

---

## 3. "General LLM/AI experience"

### Multi-Model Tiering

"In Weller Labs we had three model tiers - Haiku for fast drafts, Sonnet for standard generation, Opus for high-stakes content. The `getModel(tier)` function selected the right model based on task complexity. In RealtyAI we used Haiku exclusively because email generation is a lightweight task."

**File**: `references/wellerlabs/packages/data/src/routes/builder-generate.ts` - `getModel()` function

### Prompt Engineering Approaches

"I've worked with two paradigms. In Weller Labs, we built a modular prompt system with markdown files organized by category (base, features, guidelines, structures, technical) that get composed at runtime with variable interpolation. In RealtyAI, we used LangChain's `ChatPromptTemplate` with system/user message pairs. The modular approach is better for large teams and complex prompts; the template approach is simpler for focused use cases."

**Files**:

- `references/wellerlabs/packages/data/src/prompts/lesson-prompts/` - Modular markdown prompt system
- `references/wellerlabs/packages/data/src/prompts/generate-program-prompts-v2.ts` - Prompt composition function
- `apps/realty-ai/src/lib/ai/emailPrompt.ts` - Inline ChatPromptTemplate

### Orchestration Patterns

"I built a LangGraph pipeline with explicit state management - each node reads from and writes to a typed state object flowing through the graph. The state annotation uses reducers (similar to Redux) so each node only updates the fields it cares about. This makes the pipeline inspectable and testable - you can run any node in isolation with mock state."

**Files**:

- `apps/realty-ai/src/lib/ai/emailGraph.ts` - StateGraph definition (6 nodes, linear edges)
- `apps/realty-ai/src/lib/ai/graphState.ts` - `Annotation.Root()` with typed reducers
- `apps/realty-ai/src/lib/ai/nodes.ts` - Node implementations returning `Partial<State>`

### AWS Bedrock Integration

"Both projects use AWS Bedrock as the model provider. I've configured credentials, region selection, and model-specific parameters (temperature, max tokens). Bedrock gives you managed inference without running your own GPU infrastructure."

**Files**:

- `apps/realty-ai/src/lib/ai/llm.ts` - `ChatBedrockConverse` configuration
- `references/wellerlabs/packages/data/src/utils/bedrock-async.ts` - Async job queue with Bedrock

### RAG Preparation

"In RealtyAI, the pipeline has a `contextRetrievalNode` that currently returns a static playbook document, but it's structured as a placeholder for future RAG. The document loaders already output LangChain `Document` objects with metadata - these could go directly into a vector store for similarity search."

**Files**:

- `apps/realty-ai/src/lib/ai/nodes.ts` - `contextRetrievalNode` (static playbook placeholder)
- `apps/realty-ai/src/lib/ai/documentLoaders.ts` - `Document` objects with `pageContent` + `metadata`

### Error Resilience

"I designed multi-layer fallback chains: GraphQL API fails -> mock data. Weather API fails -> 'not available' in prompt. LLM fails -> fallback email. Output unparsable -> generic subject/body. API route fails -> client-side placeholder generation. At no point does the user see a raw error."

**Files**:

- `apps/realty-ai/src/lib/ai/weatherFetcher.ts` - Returns `null` on failure
- `apps/realty-ai/src/lib/ai/nodes.ts` - `generationNode` catches errors, returns fallback email
- `apps/realty-ai/src/app/page.tsx` - Client-side `generatePlaceholderEmail()` on API failure
- `apps/realty-ai/src/app/api/generate-email/route.ts` - `lookupClient`/`lookupProperty` try mock then GraphQL

---

## Quick Comparison Table (good to have memorized)

| Aspect                | RealtyAI                       | Weller Labs                             |
| --------------------- | ------------------------------ | --------------------------------------- |
| **Orchestration**     | LangGraph StateGraph (6 nodes) | Custom pipeline (function composition)  |
| **LLM SDK**           | LangChain (`@langchain/aws`)   | Vercel AI SDK (`generateObject`)        |
| **LLM Provider**      | AWS Bedrock (Claude 3 Haiku)   | AWS Bedrock (Haiku/Sonnet/Opus tiered)  |
| **Prompt Style**      | Inline `ChatPromptTemplate`    | Modular markdown files + interpolation  |
| **Output Validation** | Regex text parsing             | Zod schema validation + auto-repair     |
| **Streaming**         | No                             | Yes (`streamObject`)                    |
| **Async Jobs**        | No                             | Yes (S3-based queue with polling)       |
| **Error Recovery**    | Fallback emails at every level | Retry loops + `experimental_repairText` |

---

## Narrative Arc (how to tell the story)

Frame it as deliberate architectural choices for different stages:

**RealtyAI** = MVP / proof-of-concept. "I chose LangGraph because I wanted explicit pipeline orchestration with typed state. Each node is a pure function that reads from state and returns partial updates. The linear graph is simple but extensible - I can add conditional edges, parallel nodes, or RAG without restructuring. I used regex parsing over structured output for speed-to-ship, with fallbacks to handle parse failures."

**Weller Labs** = Production platform. "Here the requirements were different - we needed guaranteed JSON structure (therapy content with nested hierarchies), streaming for real-time UI updates, and multi-model tiering for cost optimization. Vercel AI SDK with Zod schemas gave us compile-time type safety plus runtime validation with auto-repair. The modular prompt system let us iterate on clinical guidelines independently of code."

**The evolution**: "Going from RealtyAI to Weller Labs, I learned that structured output (function calling under the hood) is worth the complexity for anything feeding downstream systems. Regex parsing works for MVPs but doesn't scale. And modular prompts (markdown files with interpolation) are dramatically easier to maintain than inline template strings."
