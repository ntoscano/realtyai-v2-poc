# PRD: RealtyAI Web App POC

## Introduction

RealtyAI is a lightweight, frontend-first CRM prototype enabling realtors to generate personalized outreach emails for specific property + client pairings. This project serves as a **learning vehicle** for understanding LangChain JS primitives, basic RAG pipeline design, and LangGraph orchestration.

The rebuild emphasizes **architectural clarity and reasoning** over production-grade completeness. Success is measured by learning depth and the ability to explain the architecture confidently.

---

## Goals

- Build a functional email generation prototype for realtor outreach
- Learn and implement LangChain JS core primitives (PromptTemplate, ChatBedrock, Retrievers)
- Design and implement a basic RAG pipeline with in-memory vector store
- Master LangGraph for AI orchestration with explicit control flow
- Integrate real-world data (weather API) to demonstrate hybrid RAG patterns
- Create clean data contracts that bridge frontend and AI layers

---

## Monorepo Context

This app will be added to an existing pnpm + Turbo monorepo with the following structure:

```
realtyai-v2-poc/
├── apps/
│   ├── dashboard/          # Existing: Webpack + React SPA
│   ├── web/                # Existing: Next.js app
│   └── realty-ai/          # NEW: Next.js + shadcn/ui app
├── packages/
│   ├── ui/                 # Existing: Emotion-based component library
│   └── tsconfig/           # Existing: Shared TypeScript configs
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

**Key Patterns:**

- Package naming: `@boilertowns-example/realty-ai`
- Workspace dependencies: `workspace:*` protocol
- Port convention: web=2023, dashboard=2022, **realty-ai=2024**
- Shared TypeScript configs via `@boilertowns-example/tsconfig`

---

## User Stories

### Stage 0: Monorepo & App Setup (Prerequisites)

#### US-000: Create realty-ai App Directory Structure

**Description:** As a developer, I need the realty-ai app scaffolded as a sibling to web and dashboard apps.

**Acceptance Criteria:**

- [ ] Create `/apps/realty-ai/` directory
- [ ] Initialize as Next.js 14+ app with App Router
- [ ] Create `package.json` with name `@boilertowns-example/realty-ai`
- [ ] Add workspace dependencies: `@boilertowns-example/tsconfig`
- [ ] Configure dev server on port 2024
- [ ] Verify `pnpm dev --filter=realty-ai` starts successfully

#### US-000a: Configure TypeScript for realty-ai

**Description:** As a developer, I need proper TypeScript configuration extending the monorepo's shared config.

**Acceptance Criteria:**

- [ ] Create `apps/realty-ai/tsconfig.json` extending `@boilertowns-example/tsconfig/web.json`
- [ ] Configure path aliases: `@/*` → `src/*`
- [ ] Typecheck passes with `pnpm typecheck --filter=realty-ai`

#### US-000b: Initialize shadcn/ui

**Description:** As a developer, I need shadcn/ui configured for consistent, accessible components.

**Acceptance Criteria:**

- [ ] Install Tailwind CSS and configure `tailwind.config.ts`
- [ ] Run `npx shadcn@latest init` with New York style, Zinc base color
- [ ] Configure `components.json` for `src/components/ui` path
- [ ] Install base components: Button, Card, Input, Textarea, ScrollArea
- [ ] Verify components render correctly
- [ ] Typecheck passes

#### US-000c: Configure Environment Variables

**Description:** As a developer, I need environment variable setup for AI and API integrations.

**Acceptance Criteria:**

- [ ] Create `apps/realty-ai/.env.example` with placeholder variables:

  ```
  # AWS Bedrock (ask for real values when ready to test)
  AI_AWS_BEDROCK_ACCESS_KEY_ID=your_access_key_here
  AI_AWS_BEDROCK_SECRET_ACCESS_KEY=your_secret_key_here
  AI_AWS_BEDROCK_REGION=us-east-1

  # Weather API
  OPENWEATHERMAP_API_KEY=your_api_key_here
  ```

- [ ] Create `apps/realty-ai/.env.local` (gitignored) from example
- [ ] Configure Next.js to expose `NEXT_PUBLIC_*` vars as needed
- [ ] Document env setup in app README

#### US-000d: Verify Monorepo Integration

**Description:** As a developer, I need to confirm the new app integrates properly with Turbo pipeline.

**Acceptance Criteria:**

- [ ] `pnpm build --filter=realty-ai` succeeds
- [ ] `pnpm dev` runs all apps including realty-ai
- [ ] `pnpm lint --filter=realty-ai` passes
- [ ] Turbo caching works for realty-ai builds

---

### Stage 1: Frontend-Only MVP

#### US-001: Create Mock Data Models

**Description:** As a developer, I need structured mock data for clients and properties so the frontend can simulate realistic CRM behavior.

**Acceptance Criteria:**

- [ ] Create `types/client.ts` with Client interface (id, name, email, buying_stage, preferences[], budget_range, lifestyle_notes, communication_style)
- [ ] Create `types/property.ts` with Property interface (id, address, city, state, price, beds, baths, sqft, property_type, highlights[], neighborhood_description)
- [ ] Create `data/mockClients.ts` with 15-20 realistic client entries
- [ ] Create `data/mockProperties.ts` with 15-20 realistic property entries
- [ ] Typecheck passes

#### US-002: Build Client Selection Component

**Description:** As a realtor, I want to browse and select a client from a list so I can target my outreach.

**Acceptance Criteria:**

- [ ] Create `ClientCard` component displaying name, email, buying_stage, and communication_style
- [ ] Create `ClientSelector` component with scrollable list of ClientCards
- [ ] Selected client is visually highlighted
- [ ] Selection updates parent state
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-003: Build Property Selection Component

**Description:** As a realtor, I want to browse and select a property from a list to feature in my outreach.

**Acceptance Criteria:**

- [ ] Create `PropertyCard` component displaying address, price, beds/baths/sqft, and property_type
- [ ] Create `PropertySelector` component with scrollable list of PropertyCards
- [ ] Selected property is visually highlighted
- [ ] Selection updates parent state
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-004: Build Additional Context Input

**Description:** As a realtor, I want to add optional notes so I can customize the AI's output.

**Acceptance Criteria:**

- [ ] Create `ContextInput` textarea component with placeholder text
- [ ] Helper text explains: "This helps tailor the message to your specific needs"
- [ ] Input is optional and does not block generation
- [ ] Value updates parent state
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-005: Build Email Preview Panel

**Description:** As a realtor, I want to see the generated email so I can review and copy it.

**Acceptance Criteria:**

- [ ] Create `EmailPreview` component displaying subject line and body
- [ ] Email formatted to look like actual email (proper spacing, greeting, sign-off)
- [ ] Copy-to-clipboard button for full email
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

#### US-006: Implement Placeholder Email Generation

**Description:** As a developer, I need a deterministic placeholder email generator so the UX flow is complete before AI integration.

**Acceptance Criteria:**

- [ ] Create `generatePlaceholderEmail(client, property, notes)` function
- [ ] Returns structured email with subject and body using template interpolation
- [ ] Email references client name, property address, and key highlights
- [ ] Typecheck passes

#### US-007: Build Main Application Layout

**Description:** As a realtor, I want a clean two-column layout so I can efficiently select client and property.

**Acceptance Criteria:**

- [ ] Two-column layout: left for ClientSelector, right for PropertySelector
- [ ] ContextInput below selectors
- [ ] Generate button (disabled without both selections)
- [ ] EmailPreview panel at bottom
- [ ] Responsive design for tablet/desktop
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

### Stage 2: AI Orchestration (LangChain + LangGraph)

#### US-008: Set Up LangChain Dependencies

**Description:** As a developer, I need LangChain JS packages installed and configured for AWS Bedrock.

**Acceptance Criteria:**

- [ ] Install `@langchain/core`, `@langchain/community`, `@langchain/classic`
- [ ] Install `@langchain/langgraph`
- [ ] Install `@aws-sdk/client-bedrock-runtime` for Bedrock access
- [ ] Verify AWS Bedrock credentials work with placeholder values (will fail until real keys provided)
- [ ] Typecheck passes

#### US-009: Create Document Loaders for Mock Data

**Description:** As a developer, I need to convert mock data into LangChain Documents for RAG.

**Acceptance Criteria:**

- [ ] Create `createClientDocument(client)` returning LangChain Document
- [ ] Create `createPropertyDocument(property)` returning LangChain Document
- [ ] Create static "Realtor Playbook" document with pitch guidelines
- [ ] Documents include appropriate metadata
- [ ] Typecheck passes

#### US-010: Implement In-Memory Vector Store

**Description:** As a developer, I need an in-memory vector store to demonstrate RAG retrieval.

**Acceptance Criteria:**

- [ ] Create `vectorStore.ts` using MemoryVectorStore
- [ ] Initialize with Bedrock embeddings (amazon.titan-embed-text-v1)
- [ ] Add all mock documents on initialization
- [ ] Export retriever with k=3
- [ ] Typecheck passes

#### US-011: Create Email Generation Prompt Template

**Description:** As a developer, I need a structured prompt template for email generation.

**Acceptance Criteria:**

- [ ] Create `emailPrompt.ts` with ChatPromptTemplate
- [ ] Include system message defining realtor persona
- [ ] Include context section for client, property, and retrieved docs
- [ ] Include instructions for tone, length, and format
- [ ] Include output constraints (subject + body format)
- [ ] Typecheck passes

#### US-012: Implement Weather Retriever

**Description:** As a developer, I need to fetch current weather for property location to demonstrate real-world RAG.

**Acceptance Criteria:**

- [ ] Create `weatherRetriever.ts` with fetch to weather API (OpenWeatherMap or WeatherAPI)
- [ ] Accept city and state as input
- [ ] Return normalized weather context (condition, temperature, short_summary)
- [ ] Convert response to LangChain Document format
- [ ] Handle API failures gracefully (return empty context)
- [ ] Typecheck passes

#### US-013: Define LangGraph State Annotation

**Description:** As a developer, I need a typed state object for the LangGraph pipeline.

**Acceptance Criteria:**

- [ ] Create `graphState.ts` with Annotation.Root definition
- [ ] Include: client, property, realtor_notes, weather_context, retrieved_context, final_prompt, generated_email
- [ ] All fields properly typed
- [ ] Typecheck passes

#### US-014: Implement Input Normalization Node

**Description:** As a developer, I need a node to validate and shape frontend payload.

**Acceptance Criteria:**

- [ ] Create `inputNormalizationNode` function
- [ ] Validate required fields (client, property)
- [ ] Normalize optional realtor_notes to empty string if undefined
- [ ] Return updated state
- [ ] Typecheck passes

#### US-015: Implement Weather Fetch Node

**Description:** As a developer, I need a node to fetch weather data for the property location.

**Acceptance Criteria:**

- [ ] Create `weatherFetchNode` function
- [ ] Extract city/state from property in state
- [ ] Call weather retriever
- [ ] Update state with weather_context (or empty on failure)
- [ ] Typecheck passes

#### US-016: Implement Context Retrieval Node

**Description:** As a developer, I need a node to retrieve relevant documents from the vector store.

**Acceptance Criteria:**

- [ ] Create `contextRetrievalNode` function
- [ ] Build query from client preferences and property highlights
- [ ] Retrieve documents from vector store
- [ ] Update state with retrieved_context
- [ ] Typecheck passes

#### US-017: Implement Prompt Assembly Node

**Description:** As a developer, I need a node to merge all context into the final prompt.

**Acceptance Criteria:**

- [ ] Create `promptAssemblyNode` function
- [ ] Combine client, property, weather, retrieved docs, and realtor notes
- [ ] Format into prompt template
- [ ] Update state with final_prompt
- [ ] Typecheck passes

#### US-018: Implement Generation Node

**Description:** As a developer, I need a node to call the LLM and generate the email.

**Acceptance Criteria:**

- [ ] Create `generationNode` function
- [ ] Use ChatBedrock with Claude 3 Haiku (anthropic.claude-3-haiku-20240307-v1:0)
- [ ] Pass final_prompt to model
- [ ] Parse response into subject and body
- [ ] Update state with generated_email
- [ ] Typecheck passes

#### US-019: Implement Post-Processing Node

**Description:** As a developer, I need a node to format and validate the generated email.

**Acceptance Criteria:**

- [ ] Create `postProcessingNode` function
- [ ] Enforce length constraints (body < 300 words)
- [ ] Ensure proper email formatting
- [ ] Update state with final generated_email
- [ ] Typecheck passes

#### US-020: Assemble LangGraph Pipeline

**Description:** As a developer, I need to wire all nodes into a complete StateGraph.

**Acceptance Criteria:**

- [ ] Create `emailGraph.ts` with StateGraph
- [ ] Add all nodes in order: inputNormalization → weatherFetch → contextRetrieval → promptAssembly → generation → postProcessing
- [ ] Add edges connecting all nodes linearly
- [ ] Compile graph and export
- [ ] Typecheck passes

#### US-021: Integrate Graph with Frontend

**Description:** As a realtor, I want to click Generate and receive an AI-generated email.

**Acceptance Criteria:**

- [ ] Create API route or client-side invocation of compiled graph
- [ ] Generate button triggers graph execution with current selections
- [ ] Loading state shown during generation
- [ ] EmailPreview displays AI-generated email on completion
- [ ] Error handling with user-friendly messages
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

---

## Functional Requirements

### Stage 1 - Frontend MVP

- FR-1: System must display a list of mock clients with key details (name, email, buying_stage)
- FR-2: System must display a list of mock properties with key details (address, price, beds/baths)
- FR-3: User must be able to select exactly one client and one property
- FR-4: User may optionally provide additional context via text input
- FR-5: Generate button must be disabled until both client and property are selected
- FR-6: System must display a placeholder email based on selections (Stage 1)
- FR-7: All state must be client-side only (no backend persistence)

### Stage 2 - AI Integration

- FR-8: System must convert mock data into LangChain Documents
- FR-9: System must store documents in an in-memory vector store with Bedrock Titan embeddings
- FR-10: System must retrieve relevant documents based on client/property context
- FR-11: System must fetch current weather for property location via API
- FR-12: System must gracefully handle weather API failures without blocking generation
- FR-13: System must assemble a structured prompt with all context
- FR-14: System must generate email using AWS Bedrock Claude 3 Haiku
- FR-15: System must format generated email with subject line and body
- FR-16: LangGraph pipeline must have inspectable state at each node

---

## Non-Goals (Out of Scope)

- No user authentication or authorization
- No persistent backend or database
- No real MLS or third-party data ingestion
- No production-level AI quality tuning or fine-tuning
- No streaming generation (batch response only)
- No multi-variant email generation
- No feedback loop from realtor edits
- No mobile-responsive design (tablet/desktop only)

---

## Technical Considerations

### Tech Stack

- **Frontend:** React 18 + TypeScript + Next.js 14+ (App Router)
- **UI Components:** shadcn/ui (New York style, Zinc base)
- **Styling:** Tailwind CSS
- **AI:** LangChain JS, LangGraph, AWS Bedrock (Claude 3 Haiku + Titan Embeddings)
- **Vector Store:** MemoryVectorStore (in-memory, ephemeral)
- **Weather API:** OpenWeatherMap or WeatherAPI (free tier)
- **Package Manager:** pnpm with workspace protocol

### Environment Variables

```bash
# AWS Bedrock credentials (placeholder - ask for real values when ready to test)
AI_AWS_BEDROCK_ACCESS_KEY_ID=your_access_key_here
AI_AWS_BEDROCK_SECRET_ACCESS_KEY=your_secret_key_here
AI_AWS_BEDROCK_REGION=us-east-1

# Weather API
OPENWEATHERMAP_API_KEY=your_api_key_here
```

### Architecture Patterns

#### RAG Pipeline Pattern

```
Frontend Payload → Document Retrieval → Context Assembly → LLM Generation → Email Output
```

#### LangGraph State Machine Pattern

```
__start__ → inputNormalization → weatherFetch → contextRetrieval → promptAssembly → generation → postProcessing → __end__
```

### Key Dependencies

```json
{
	"@langchain/core": "^0.3.x",
	"@langchain/community": "^0.3.x",
	"@langchain/classic": "^0.3.x",
	"@langchain/langgraph": "^0.2.x",
	"@aws-sdk/client-bedrock-runtime": "^3.x"
}
```

---

## Pseudo Code Examples

### LangChain: MemoryVectorStore Setup with Bedrock Embeddings

```typescript
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { BedrockEmbeddings } from '@langchain/community/embeddings/bedrock';
import type { Document } from '@langchain/core/documents';

// Initialize Bedrock embeddings (Titan)
const embeddings = new BedrockEmbeddings({
	region: process.env.AI_AWS_BEDROCK_REGION,
	credentials: {
		accessKeyId: process.env.AI_AWS_BEDROCK_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AI_AWS_BEDROCK_SECRET_ACCESS_KEY!,
	},
	model: 'amazon.titan-embed-text-v1',
});

// Create vector store
const vectorStore = new MemoryVectorStore(embeddings);

// Add documents
const documents: Document[] = [
	{
		pageContent:
			'Client: John Smith prefers modern condos in downtown areas...',
		metadata: { type: 'client', id: 'client-1' },
	},
	{
		pageContent: 'Property: 123 Main St - Stunning 3BR home with pool...',
		metadata: { type: 'property', id: 'property-1' },
	},
];

await vectorStore.addDocuments(documents);

// Convert to retriever
const retriever = vectorStore.asRetriever({ k: 3 });
const results = await retriever.invoke('modern condo downtown');
```

### LangChain: ChatPromptTemplate

```typescript
import { ChatPromptTemplate } from '@langchain/core/prompts';

const emailPromptTemplate = ChatPromptTemplate.fromMessages([
	[
		'system',
		`You are a professional real estate agent writing personalized outreach emails.
Your tone should match the client's communication style: {communication_style}.
Keep emails concise (under 300 words) and focus on property highlights that match client preferences.`,
	],

	[
		'user',
		`Generate a personalized email for the following:

CLIENT PROFILE:
Name: {client_name}
Preferences: {client_preferences}
Budget: {budget_range}
Lifestyle Notes: {lifestyle_notes}

PROPERTY DETAILS:
Address: {property_address}
Price: {property_price}
Features: {property_highlights}
Neighborhood: {neighborhood_description}

ADDITIONAL CONTEXT:
{retrieved_context}

{weather_context}

REALTOR NOTES:
{realtor_notes}

Generate an email with:
1. A compelling subject line
2. A personalized body that connects the property to the client's needs

Format your response as:
SUBJECT: [subject line]
BODY:
[email body]`,
	],
]);

// Invoke the template
const formattedPrompt = await emailPromptTemplate.invoke({
	communication_style: 'casual',
	client_name: 'John Smith',
	client_preferences: 'modern design, home office, quiet neighborhood',
	budget_range: '$500k - $700k',
	lifestyle_notes: 'Works remotely, enjoys gardening',
	property_address: '123 Main St, Austin, TX',
	property_price: '$625,000',
	property_highlights: 'Open floor plan, dedicated office, large backyard',
	neighborhood_description: 'Quiet residential area with top-rated schools',
	retrieved_context: 'From playbook: Emphasize work-from-home features...',
	weather_context: 'Current weather in Austin: Sunny, 75°F',
	realtor_notes: 'Met John at open house last week, very interested',
});
```

### LangChain: ChatBedrock with Prompt Chain

```typescript
import { ChatBedrock } from '@langchain/community/chat_models/bedrock';
import { StringOutputParser } from '@langchain/core/output_parsers';

// Initialize Bedrock with Claude 3 Haiku
const llm = new ChatBedrock({
	region: process.env.AI_AWS_BEDROCK_REGION,
	credentials: {
		accessKeyId: process.env.AI_AWS_BEDROCK_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AI_AWS_BEDROCK_SECRET_ACCESS_KEY!,
	},
	model: 'anthropic.claude-3-haiku-20240307-v1:0',
	modelKwargs: {
		temperature: 0.7,
		max_tokens: 1024,
	},
});

// Create chain: prompt → llm → parse
const emailChain = emailPromptTemplate.pipe(llm).pipe(new StringOutputParser());

// Execute chain
const generatedEmail = await emailChain.invoke({
	// ... all template variables
});
```

### LangGraph: State Annotation

```typescript
import { Annotation } from '@langchain/langgraph';

// Define the graph state shape
const EmailGraphState = Annotation.Root({
	// Input from frontend
	client: Annotation<Client>,
	property: Annotation<Property>,
	realtor_notes: Annotation<string>,

	// Retrieved context
	weather_context: Annotation<string>,
	retrieved_context: Annotation<string>,

	// Intermediate
	final_prompt: Annotation<string>,

	// Output
	generated_email: Annotation<{
		subject: string;
		body: string;
	}>,
});

type EmailGraphStateType = typeof EmailGraphState.State;
```

### LangGraph: Node Functions

```typescript
// Node 1: Input Normalization
const inputNormalizationNode = async (state: EmailGraphStateType) => {
	// Validate required fields
	if (!state.client || !state.property) {
		throw new Error('Client and property are required');
	}

	return {
		realtor_notes: state.realtor_notes ?? '',
	};
};

// Node 2: Weather Fetch
const weatherFetchNode = async (state: EmailGraphStateType) => {
	try {
		const { city, state: propertyState } = state.property;
		const weather = await fetchWeather(city, propertyState);

		return {
			weather_context: `Current weather in ${city}: ${weather.condition}, ${weather.temperature}°F. ${weather.short_summary}`,
		};
	} catch (error) {
		// Graceful degradation - continue without weather
		console.warn('Weather fetch failed:', error);
		return { weather_context: '' };
	}
};

// Node 3: Context Retrieval
const contextRetrievalNode = async (state: EmailGraphStateType) => {
	const query = [
		...state.client.preferences,
		...state.property.highlights,
	].join(' ');

	const docs = await retriever.invoke(query);
	const context = docs.map((d) => d.pageContent).join('\n\n');

	return { retrieved_context: context };
};

// Node 4: Prompt Assembly
const promptAssemblyNode = async (state: EmailGraphStateType) => {
	const prompt = await emailPromptTemplate.format({
		communication_style: state.client.communication_style,
		client_name: state.client.name,
		client_preferences: state.client.preferences.join(', '),
		budget_range: state.client.budget_range,
		lifestyle_notes: state.client.lifestyle_notes,
		property_address: `${state.property.address}, ${state.property.city}, ${state.property.state}`,
		property_price: `$${state.property.price.toLocaleString()}`,
		property_highlights: state.property.highlights.join(', '),
		neighborhood_description: state.property.neighborhood_description,
		retrieved_context: state.retrieved_context,
		weather_context: state.weather_context
			? `Recent weather: ${state.weather_context}`
			: '',
		realtor_notes: state.realtor_notes || 'None provided',
	});

	return { final_prompt: prompt };
};

// Node 5: Generation (using Bedrock Claude 3 Haiku)
const generationNode = async (state: EmailGraphStateType) => {
	// llm is ChatBedrock instance configured with Claude 3 Haiku
	const response = await llm.invoke(state.final_prompt);
	const content = response.content as string;

	// Parse subject and body from response
	const subjectMatch = content.match(/SUBJECT:\s*(.+)/);
	const bodyMatch = content.match(/BODY:\s*([\s\S]+)/);

	return {
		generated_email: {
			subject: subjectMatch?.[1]?.trim() ?? 'Property Recommendation',
			body: bodyMatch?.[1]?.trim() ?? content,
		},
	};
};

// Node 6: Post-Processing
const postProcessingNode = async (state: EmailGraphStateType) => {
	let { subject, body } = state.generated_email;

	// Enforce length constraint
	const words = body.split(/\s+/);
	if (words.length > 300) {
		body = words.slice(0, 300).join(' ') + '...';
	}

	return {
		generated_email: { subject, body },
	};
};
```

### LangGraph: Complete Graph Assembly

```typescript
import { END, START, StateGraph } from '@langchain/langgraph';

// Create the graph
const emailGraphBuilder = new StateGraph(EmailGraphState)
	// Add all nodes
	.addNode('inputNormalization', inputNormalizationNode)
	.addNode('weatherFetch', weatherFetchNode)
	.addNode('contextRetrieval', contextRetrievalNode)
	.addNode('promptAssembly', promptAssemblyNode)
	.addNode('generation', generationNode)
	.addNode('postProcessing', postProcessingNode)

	// Define edges (linear flow)
	.addEdge(START, 'inputNormalization')
	.addEdge('inputNormalization', 'weatherFetch')
	.addEdge('weatherFetch', 'contextRetrieval')
	.addEdge('contextRetrieval', 'promptAssembly')
	.addEdge('promptAssembly', 'generation')
	.addEdge('generation', 'postProcessing')
	.addEdge('postProcessing', END);

// Compile the graph
export const emailGraph = emailGraphBuilder.compile();
emailGraph.name = 'RealtyAI Email Generator';

// Usage
const result = await emailGraph.invoke({
	client: selectedClient,
	property: selectedProperty,
	realtor_notes: additionalContext,
});

console.log(result.generated_email);
// { subject: "...", body: "..." }
```

### LangGraph: Conditional Edge Example (Future Extension)

```typescript
// Example: Route based on email length for potential retry
const routeByLength = (state: EmailGraphStateType) => {
	const wordCount = state.generated_email.body.split(/\s+/).length;

	if (wordCount < 50) {
		return 'regenerate'; // Too short, try again
	} else if (wordCount > 400) {
		return 'truncate'; // Too long, needs trimming
	}
	return '__end__'; // Good to go
};

// Add conditional routing
graphBuilder.addConditionalEdges('generation', routeByLength, {
	regenerate: 'generation',
	truncate: 'postProcessing',
	__end__: END,
});
```

### Weather Retriever Implementation

```typescript
interface WeatherResponse {
	condition: string;
	temperature: number;
	short_summary: string;
}

async function fetchWeather(
	city: string,
	state: string,
): Promise<WeatherResponse> {
	const apiKey = process.env.OPENWEATHERMAP_API_KEY;
	const url = `https://api.openweathermap.org/data/2.5/weather?q=${city},${state},US&appid=${apiKey}&units=imperial`;

	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Weather API error: ${response.status}`);
	}

	const data = await response.json();

	return {
		condition: data.weather[0].main,
		temperature: Math.round(data.main.temp),
		short_summary: `${data.weather[0].description} with ${Math.round(
			data.main.temp,
		)}°F`,
	};
}

// Convert to LangChain Document
function weatherToDocument(weather: WeatherResponse, city: string): Document {
	return {
		pageContent: `Recent weather in ${city}: ${weather.short_summary}`,
		metadata: { type: 'weather', city, fetchedAt: new Date().toISOString() },
	};
}
```

---

## Design Considerations

### UI Layout

```
+---------------------------+---------------------------+
|      Client Selector      |     Property Selector     |
|  [Scrollable Card List]   |  [Scrollable Card List]   |
+---------------------------+---------------------------+
|                                                       |
|              Additional Context (Optional)            |
|              [Textarea with helper text]              |
|                                                       |
+-------------------------------------------------------+
|                                                       |
|                  [Generate Email Button]              |
|                                                       |
+-------------------------------------------------------+
|                                                       |
|                    Email Preview                      |
|  Subject: [Generated Subject]                         |
|  ─────────────────────────────────                    |
|  [Generated Email Body]                               |
|                                                       |
|                            [Copy to Clipboard]        |
+-------------------------------------------------------+
```

### Component Hierarchy

```
App
├── Header
├── MainContent
│   ├── SelectionPanel
│   │   ├── ClientSelector
│   │   │   └── ClientCard (multiple)
│   │   └── PropertySelector
│   │       └── PropertyCard (multiple)
│   ├── ContextInput
│   └── GenerateButton
└── EmailPreview
    └── CopyButton
```

---

## Success Metrics

- All mock data correctly structured and typed
- UX flow clearly maps to AI prompt inputs
- RAG pipeline successfully retrieves relevant documents
- Weather integration works with graceful fallback
- LangGraph state is inspectable at each node
- Generated emails are contextually relevant and properly formatted
- Architecture can be confidently explained in documentation

---

## Open Questions

1. Should we add a "Regenerate" button for users unsatisfied with the first result?
2. Should the email preview show the retrieved context for transparency?
3. What specific weather API should be used (OpenWeatherMap vs WeatherAPI)?
4. Should we add loading spinners per-node to show pipeline progress?

---

## Notes

**AWS Bedrock Credentials:** The app uses placeholder environment variables for AWS Bedrock:

- `AI_AWS_BEDROCK_ACCESS_KEY_ID`
- `AI_AWS_BEDROCK_SECRET_ACCESS_KEY`

**Action Required:** When ready to test AI functionality, ask the user for real AWS Bedrock credentials. The app will function in Stage 1 (frontend-only) without these credentials.

---

## References

- [LangChain.js Documentation](https://docs.langchain.com/oss/javascript/)
- [LangGraph.js Documentation](https://langchain-ai.github.io/langgraphjs/)
- [MemoryVectorStore](https://docs.langchain.com/oss/javascript/integrations/vectorstores/memory/)
- [LangGraph Glossary](https://langchain-ai.github.io/langgraphjs/concepts/low_level/)
- [ChatBedrock Integration](https://js.langchain.com/docs/integrations/chat/bedrock/)
- [Bedrock Embeddings](https://js.langchain.com/docs/integrations/text_embedding/bedrock/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
