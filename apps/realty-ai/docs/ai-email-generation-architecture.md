# RealtyAI Email Generation Architecture

## Overview

This document describes the AI email generation system used in RealtyAI to create personalized property pitch emails for real estate agents. The system uses a **LangGraph state machine** to orchestrate a multi-step pipeline that gathers context, assembles prompts, and generates emails via AWS Bedrock.

## Architecture Summary

The system follows a **LangGraph pipeline architecture** with **typed state management** throughout:

1. **LangGraph StateGraph** → Defines a 6-node linear pipeline
2. **LangChain Documents** → Structure client/property data for prompt assembly
3. **ChatPromptTemplate** → System/user message pair with variable interpolation
4. **AWS Bedrock (Claude 3 Haiku)** → LLM generation via `@langchain/aws`
5. **Regex Text Parsing** → Extracts SUBJECT/BODY from raw LLM output
6. **Dual Data Sources** → GraphQL API with mock data fallback

---

## System Flow: End-to-End

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                         │
│                  (page.tsx - React Client Component)             │
│                                                                 │
│  • Select client from dropdown                                  │
│  • Select property from dropdown                                │
│  • Optionally add context notes                                 │
│  • Click "Generate Email"                                       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ 1. POST /api/generate-email
                                │    { clientId, propertyId, notes? }
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                        API ROUTE HANDLER                        │
│               (app/api/generate-email/route.ts)                 │
│                                                                 │
│  • Validates request body (clientId, propertyId required)       │
│  • Looks up client: mock data first, then GraphQL (if UUID)    │
│  • Looks up property: mock data first, then GraphQL (if UUID)  │
│  • Returns 400/404 on validation/lookup failure                │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ 2. emailGraph.invoke({ client, property, realtor_notes })
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                      LANGGRAPH PIPELINE                         │
│                    (lib/ai/emailGraph.ts)                        │
│                                                                 │
│  ┌──────────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │ 1. Input         │──▶│ 2. Weather   │──▶│ 3. Context     │  │
│  │    Normalization  │   │    Fetch     │   │    Retrieval   │  │
│  └──────────────────┘   └──────────────┘   └───────┬────────┘  │
│                                                     │           │
│  ┌──────────────────┐   ┌──────────────┐   ┌───────▼────────┐  │
│  │ 6. Post-         │◀──│ 5. LLM      │◀──│ 4. Prompt      │  │
│  │    Processing     │   │    Generation│   │    Assembly    │  │
│  └──────────────────┘   └──────────────┘   └────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ 3. Returns { subject, body }
                                ↓
┌─────────────────────────────────────────────────────────────────┐
│                        UI UPDATE                                │
│                  (EmailPreview component)                        │
│                                                                 │
│  • Displays generated subject and body                          │
│  • Shows error message + placeholder fallback on failure        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. UI Layer: page.tsx

**File**: `apps/realty-ai/src/app/page.tsx`

**Responsibilities**:

- Fetches client/property data from GraphQL API (with mock data fallback)
- Manages selection state for client, property, and context notes
- Calls `POST /api/generate-email` on submit
- Displays generated email or fallback placeholder on error
- Shows data source indicator (GraphQL vs mock data)

**Key Features**:

- **Dual Data Sources**: Uses `useProperties()` and `useClients()` GraphQL hooks, falls back to mock data arrays if API is unavailable
- **Fallback Generation**: On API error, generates a placeholder email client-side via `generatePlaceholderEmail()`
- **Loading States**: Disabled button during generation, loading indicators during data fetch

```typescript
// Data source priority
const properties =
	graphqlProperties.length > 0 ? graphqlProperties : mockProperties;
const clients = graphqlClients.length > 0 ? graphqlClients : mockClients;
```

---

### 2. API Route: /api/generate-email

**File**: `apps/realty-ai/src/app/api/generate-email/route.ts`

**Responsibilities**:

- Validates request body (clientId and propertyId required)
- Resolves client and property from dual data sources
- Invokes the LangGraph pipeline
- Returns generated email or error response

**Data Lookup Strategy**:

```typescript
async function lookupClient(clientId: string): Promise<Client | null> {
	// 1. Try mock data first (backwards compatibility)
	const mockClient = mockClients.find((c) => c.id === clientId);
	if (mockClient) return mockClient;

	// 2. If UUID format, try GraphQL
	if (isUUID(clientId)) {
		const { data } = await apolloClient.query<ClientByIdResponse>({
			query: GET_CLIENT_BY_ID,
			variables: { id: clientId },
		});
		if (data?.clientById) return transformClient(data.clientById);
	}

	return null;
}
```

**Error Responses**:

- `400`: Missing or invalid clientId/propertyId, malformed JSON
- `404`: Client or property not found in any data source
- `500`: LLM generation failure or internal error

---

### 3. Graph Definition: emailGraph.ts

**File**: `apps/realty-ai/src/lib/ai/emailGraph.ts`

**Purpose**: Defines and compiles the LangGraph StateGraph

```typescript
const emailGraphBuilder = new StateGraph(EmailGraphState)
	.addNode('inputNormalization', inputNormalizationNode)
	.addNode('weatherFetch', weatherFetchNode)
	.addNode('contextRetrieval', contextRetrievalNode)
	.addNode('promptAssembly', promptAssemblyNode)
	.addNode('generation', generationNode)
	.addNode('postProcessing', postProcessingNode)
	.addEdge(START, 'inputNormalization')
	.addEdge('inputNormalization', 'weatherFetch')
	.addEdge('weatherFetch', 'contextRetrieval')
	.addEdge('contextRetrieval', 'promptAssembly')
	.addEdge('promptAssembly', 'generation')
	.addEdge('generation', 'postProcessing')
	.addEdge('postProcessing', END);

export const emailGraph = emailGraphBuilder.compile();
```

**Key Points**:

- Linear pipeline (no conditional edges or branching)
- All edges are static `.addEdge()` connections
- Graph is compiled once at module load, reused across requests
- Invoked with: `emailGraph.invoke({ client, property, realtor_notes })`

---

### 4. State Annotation: graphState.ts

**File**: `apps/realty-ai/src/lib/ai/graphState.ts`

**Purpose**: Defines the typed state that flows through the graph

```typescript
export const EmailGraphState = Annotation.Root({
	client: Annotation<Client | null>({
		reducer: (_, newVal) => newVal,
		default: () => null,
	}),
	property: Annotation<Property | null>({
		reducer: (_, newVal) => newVal,
		default: () => null,
	}),
	realtor_notes: Annotation<string>({
		reducer: (_, newVal) => newVal,
		default: () => '',
	}),
	weather_context: Annotation<WeatherContext>({
		reducer: (_, newVal) => newVal,
		default: () => null,
	}),
	retrieved_context: Annotation<string>({
		reducer: (_, newVal) => newVal,
		default: () => '',
	}),
	final_prompt: Annotation<string>({
		reducer: (_, newVal) => newVal,
		default: () => '',
	}),
	generated_email: Annotation<GeneratedEmail | null>({
		reducer: (_, newVal) => newVal,
		default: () => null,
	}),
});
```

**State Fields**:

| Field               | Type                     | Set By                      | Purpose                       |
| ------------------- | ------------------------ | --------------------------- | ----------------------------- |
| `client`            | `Client \| null`         | Caller                      | Selected client data          |
| `property`          | `Property \| null`       | Caller                      | Selected property data        |
| `realtor_notes`     | `string`                 | Caller / inputNormalization | Optional realtor context      |
| `weather_context`   | `WeatherContext \| null` | weatherFetch                | Weather for property location |
| `retrieved_context` | `string`                 | contextRetrieval            | Playbook/RAG context          |
| `final_prompt`      | `string`                 | promptAssembly              | Complete prompt for LLM       |
| `generated_email`   | `GeneratedEmail \| null` | generation / postProcessing | Final email output            |

**Reducer Pattern**: All fields use a simple "last write wins" reducer: `(_, newVal) => newVal`. This means each node's partial return overwrites only the fields it sets, leaving other fields unchanged.

---

### 5. LLM Configuration: llm.ts

**File**: `apps/realty-ai/src/lib/ai/llm.ts`

**Purpose**: Configures the LangChain LLM instance

```typescript
export const llm = new ChatBedrockConverse({
	model: 'anthropic.claude-3-haiku-20240307-v1:0',
	region: process.env.AI_AWS_BEDROCK_REGION || 'us-east-1',
	credentials: {
		accessKeyId: process.env.AI_AWS_BEDROCK_ACCESS_KEY_ID || '',
		secretAccessKey: process.env.AI_AWS_BEDROCK_SECRET_ACCESS_KEY || '',
	},
	temperature: 0.7,
	maxTokens: 1024,
});
```

**Configuration**:

| Setting     | Value          | Rationale                                            |
| ----------- | -------------- | ---------------------------------------------------- |
| Model       | Claude 3 Haiku | Fast, cost-effective for short-form email generation |
| Temperature | 0.7            | Balanced creativity for personalized emails          |
| Max Tokens  | 1024           | Sufficient for 300-word emails with subject lines    |
| Provider    | AWS Bedrock    | Production-grade, managed inference                  |

**Authentication**: AWS credentials from environment variables (`AI_AWS_BEDROCK_ACCESS_KEY_ID`, `AI_AWS_BEDROCK_SECRET_ACCESS_KEY`, `AI_AWS_BEDROCK_REGION`).

---

### 6. Prompt Template: emailPrompt.ts

**File**: `apps/realty-ai/src/lib/ai/emailPrompt.ts`

**Purpose**: Defines the two-part ChatPromptTemplate for email generation

**System Message** (realtor persona):

```
You are an experienced, successful real estate agent who excels at personalized
client communication. Your emails are known for being warm, engaging, and highly
effective at getting clients excited about properties.

Key traits:
- You always personalize based on what you know about the client
- You match your tone to the client's communication style
- You highlight property features that align with the client's specific preferences
- You're concise but compelling
- You never use pushy sales tactics
```

**User Message Template** (5 input variables):

```
Write a personalized email to pitch a property to a client.

CLIENT INFORMATION:
{client_info}

PROPERTY INFORMATION:
{property_info}

REALTOR GUIDELINES:
{context}

CURRENT WEATHER (use to add a personal touch if relevant):
{weather}

ADDITIONAL NOTES FROM REALTOR (incorporate if provided):
{notes}

INSTRUCTIONS:
1. Match your tone to the client's communication style:
   - "formal": Professional language, complete sentences, proper structure
   - "casual": Friendly, conversational tone, contractions okay
   - "enthusiastic": High energy, excitement, exclamation points welcome

2. Length: Keep the email under 300 words total

3. Structure:
   - Personalized greeting using the client's first name
   - Opening that references something about their preferences
   - 2-3 short paragraphs highlighting property features that match their needs
   - Optional weather tie-in if it adds value
   - Clear call to action with flexible options
   - Professional sign-off

4. Output format (CRITICAL - follow this exactly):
   SUBJECT: [Your compelling subject line here]

   BODY:
   [Your complete email body here]
```

**Input Variables**:

| Variable        | Source                         | Content                                                                   |
| --------------- | ------------------------------ | ------------------------------------------------------------------------- |
| `client_info`   | `createClientDocument()`       | Name, email, buying stage, budget, style, preferences, lifestyle          |
| `property_info` | `createPropertyDocument()`     | Address, location, price, type, beds/baths/sqft, highlights, neighborhood |
| `context`       | `getRealtorPlaybookDocument()` | Static pitch guidelines (7 sections)                                      |
| `weather`       | `weatherFetchNode`             | Current conditions or "Weather information not available"                 |
| `notes`         | User input                     | Realtor's additional context or "None provided"                           |

---

### 7. Document Loaders: documentLoaders.ts

**File**: `apps/realty-ai/src/lib/ai/documentLoaders.ts`

**Purpose**: Convert typed data objects into LangChain Documents for prompt assembly

**Three document creators**:

**`createClientDocument(client)`** - Formats client data as plain text:

```
Client: Sarah Mitchell
Email: sarah.mitchell@email.com
Buying Stage: ready_to_offer
Budget Range: $450,000 - $550,000
Communication Style: enthusiastic
Preferences: open floor plan, updated kitchen, home office space
Lifestyle Notes: Remote worker, enjoys hosting dinner parties, has two cats
```

**`createPropertyDocument(property)`** - Formats property with currency/number formatting:

```
Property: 123 Oak Street
Location: Austin, TX
Price: $495,000
Type: SFH
Bedrooms: 3
Bathrooms: 2
Square Feet: 2,100
Highlights: updated kitchen, home office, open floor plan
Neighborhood: Family-friendly area with parks and coffee shops
```

**`getRealtorPlaybookDocument()`** - Returns a static playbook covering 7 topics:

1. Opening Hooks - personalized greeting strategies
2. Property Presentation - feature highlighting with sensory language
3. Neighborhood Context - connecting amenities to lifestyle
4. Weather-Aware Selling - leveraging weather for urgency/comfort
5. Call to Action - flexible next steps without pressure
6. Tone Matching - formal/casual/enthusiastic strategies
7. Length Guidelines - mobile-friendly formatting (< 300 words)

---

### 8. Weather Fetcher: weatherFetcher.ts

**File**: `apps/realty-ai/src/lib/ai/weatherFetcher.ts`

**Purpose**: Fetch real-time weather for the property's location

```typescript
export async function fetchWeather(
	city: string,
	state: string,
): Promise<WeatherContext> {
	const apiKey = process.env.OPENWEATHERMAP_API_KEY;
	if (!apiKey) return null;

	const query = encodeURIComponent(`${city},${state},US`);
	const url = `https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${apiKey}&units=imperial`;

	const response = await fetch(url);
	const data: OpenWeatherMapResponse = await response.json();

	return {
		condition: data.weather[0]?.main || 'Unknown',
		temperature: Math.round(data.main.temp),
		short_summary: `${temperature}°F with ${description}`,
	};
}
```

**Behavior**:

- Returns `null` if `OPENWEATHERMAP_API_KEY` is not set (graceful skip)
- Returns `null` on any API error (non-blocking failure)
- Uses imperial units (Fahrenheit)
- Queries OpenWeatherMap with `city,state,US` format

---

### 9. Graph Nodes: nodes.ts

**File**: `apps/realty-ai/src/lib/ai/nodes.ts`

**Purpose**: Implements the 6 pipeline steps as standalone async functions

Each node receives the full state and returns `Partial<EmailGraphStateType>` (only the fields it modifies).

#### Node 1: `inputNormalizationNode`

- **Validates** client and property are present (throws if missing)
- **Normalizes** realtor_notes (trims whitespace, converts empty to `''`)

#### Node 2: `weatherFetchNode`

- **Calls** `fetchWeather(property.city, property.state)`
- **Sets** `weather_context` to result or `null` on failure

#### Node 3: `contextRetrievalNode`

- **Retrieves** static realtor playbook via `getRealtorPlaybookDocument()`
- **Sets** `retrieved_context` to the playbook's `pageContent`
- **Note**: This is a placeholder for future RAG/vector store retrieval

#### Node 4: `promptAssemblyNode`

- **Creates** LangChain Documents from client and property data
- **Formats** weather info and notes into display strings
- **Calls** `emailPromptTemplate.format()` with all 5 variables
- **Sets** `final_prompt` to the complete formatted prompt

#### Node 5: `generationNode`

- **Invokes** the LLM with `llm.invoke(final_prompt)`
- **Extracts** text content from response (handles string, array, or object formats)
- **Parses** response with `parseEmailResponse()` using regex:
  ```typescript
  const subjectMatch = response.match(/SUBJECT:\s*(.+?)(?=\n|BODY:|$)/i);
  const bodyMatch = response.match(/BODY:\s*([\s\S]+?)$/i);
  ```
- **Falls back** to generic email if parsing fails or LLM errors

#### Node 6: `postProcessingNode`

- **Counts** words in email body
- **Truncates** to 297 words + `"..."` if over 300-word limit
- **Passes through** unchanged if within limit

---

## Key Design Patterns

### 1. LangGraph State Management

**Pattern**: Define typed state with `Annotation.Root()`, each node returns partial state updates

**How it works**:

- State is defined once with types, reducers, and defaults
- Each node receives full state, returns only changed fields
- Reducers merge partial updates into the running state
- All reducers use "last write wins" (`(_, newVal) => newVal`)

**Benefits**:

- Type-safe state throughout the pipeline
- Nodes are decoupled - they only know about the state interface
- Easy to add new fields or nodes without breaking existing ones
- State is inspectable between nodes for debugging

---

### 2. LangChain Document Pattern

**Pattern**: Convert domain objects into `Document` instances with `pageContent` and `metadata`

```typescript
const clientDocument = createClientDocument(client);
// clientDocument.pageContent = "Client: Sarah Mitchell\nEmail: ..."
// clientDocument.metadata = { type: 'client', id: 'client-001' }
```

**Benefits**:

- Consistent format for prompt assembly
- Ready for future RAG integration (documents can go into vector stores)
- Metadata enables filtering and tracing

---

### 3. Graceful Degradation

**Pattern**: Every external dependency has a fallback path

| Failure Point             | Fallback                                                      |
| ------------------------- | ------------------------------------------------------------- |
| GraphQL API unavailable   | Mock data arrays                                              |
| Weather API missing/fails | `weather_context: null` → "Weather information not available" |
| LLM response unparseable  | Fallback email with generic subject/body                      |
| LLM invocation fails      | Fallback email with generic subject/body                      |
| API route fails           | Client-side `generatePlaceholderEmail()`                      |

---

### 4. Text-Based Output Parsing

**Pattern**: LLM outputs free text with `SUBJECT:` and `BODY:` markers, parsed via regex

```typescript
const subjectMatch = response.match(/SUBJECT:\s*(.+?)(?=\n|BODY:|$)/i);
const bodyMatch = response.match(/BODY:\s*([\s\S]+?)$/i);
```

**Trade-offs**:

- Simple implementation, no schema library dependency
- Fragile if LLM doesn't follow format (mitigated by fallback)
- No type validation on output content
- Could be replaced with structured output (Zod + `withStructuredOutput()`) for robustness

---

## Comparison: RealtyAI vs Weller Labs

| Aspect                | RealtyAI                                             | Weller Labs                                         |
| --------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| **Orchestration**     | LangGraph StateGraph (6 nodes, linear)               | Custom pipeline (function composition)              |
| **LLM SDK**           | LangChain (`@langchain/aws`, `ChatBedrockConverse`)  | Vercel AI SDK (`generateObject`, `streamObject`)    |
| **LLM Provider**      | AWS Bedrock (Claude 3 Haiku)                         | AWS Bedrock (Haiku/Sonnet/Opus) + Claude Code (dev) |
| **Prompt Style**      | Inline `ChatPromptTemplate` (system + user messages) | Modular markdown files with variable interpolation  |
| **Output Validation** | Regex text parsing (SUBJECT/BODY markers)            | Zod schema validation with auto-repair              |
| **Output Format**     | Free text → parsed to `{ subject, body }`            | Structured JSON → validated against schema          |
| **Streaming**         | No (full response)                                   | Yes (`streamObject` with partial updates)           |
| **State Management**  | LangGraph `Annotation.Root` with reducers            | React hooks (`useObject`, `useState`)               |
| **Context Sources**   | Static playbook document + weather API               | Modular markdown files + comments + plugins         |
| **Data Sources**      | Mock data + GraphQL (PostGraphile)                   | GraphQL (Apollo Client)                             |
| **Async Jobs**        | No (synchronous request/response)                    | Yes (job queue with polling for long generations)   |
| **Error Recovery**    | Fallback emails at every level                       | Retry loops + auto-repair on schema failures        |
| **Multi-Model**       | Single model (Haiku)                                 | Tiered (Haiku/Sonnet/Opus based on task)            |

### Key Architectural Differences

**RealtyAI uses LangGraph** for explicit pipeline orchestration with typed state flowing through nodes. Each step is a discrete function that reads from and writes to a shared state object. This makes the pipeline inspectable, testable, and extensible (easy to add conditional branches or parallel nodes).

**Weller Labs uses Vercel AI SDK** for direct structured object generation. The pipeline is implicit in the function call chain rather than declared as a graph. Output validation is built into the generation call via Zod schemas, which provides stronger guarantees but less visibility into intermediate steps.

---

## Data Types

### Client

```typescript
type BuyingStage = 'browsing' | 'active' | 'ready_to_offer';
type CommunicationStyle = 'formal' | 'casual' | 'enthusiastic';

type Client = {
	id: string;
	name: string;
	email: string;
	buying_stage: BuyingStage;
	preferences: string[];
	budget_range: string;
	lifestyle_notes: string;
	communication_style: CommunicationStyle;
};
```

### Property

```typescript
type PropertyType = 'SFH' | 'condo' | 'townhouse';

type Property = {
	id: string;
	address: string;
	city: string;
	state: string;
	price: number;
	beds: number;
	baths: number;
	sqft: number;
	property_type: PropertyType;
	highlights: string[];
	neighborhood_description: string;
};
```

### GeneratedEmail

```typescript
type GeneratedEmail = {
	subject: string;
	body: string;
};
```

### WeatherContext

```typescript
type WeatherContext = {
	condition: string; // e.g., "Clear", "Rain"
	temperature: number; // Fahrenheit, rounded
	short_summary: string; // e.g., "72°F with light rain"
} | null;
```

---

## File Organization

```
apps/realty-ai/src/
├── app/
│   ├── api/
│   │   └── generate-email/
│   │       └── route.ts              # POST endpoint - validates, looks up data, invokes graph
│   ├── page.tsx                      # Main UI - selectors, generate button, email preview
│   └── layout.tsx                    # Root layout
├── lib/
│   ├── ai/
│   │   ├── emailGraph.ts            # StateGraph definition and compilation
│   │   ├── graphState.ts            # State annotation (7 typed fields)
│   │   ├── nodes.ts                 # 6 node implementations
│   │   ├── llm.ts                   # ChatBedrockConverse configuration
│   │   ├── emailPrompt.ts           # ChatPromptTemplate (system + user messages)
│   │   ├── documentLoaders.ts       # Client, Property, Playbook document creators
│   │   └── weatherFetcher.ts        # OpenWeatherMap API integration
│   ├── graphql/
│   │   ├── client.ts                # Apollo Client configuration
│   │   ├── queries.ts               # GraphQL query definitions
│   │   └── hooks.ts                 # useProperties(), useClients() hooks
│   └── generatePlaceholderEmail.ts   # Client-side fallback email generator
├── components/
│   ├── ClientSelector.tsx            # Client dropdown
│   ├── PropertySelector.tsx          # Property dropdown
│   ├── ContextInput.tsx              # Realtor notes textarea
│   ├── EmailPreview.tsx              # Generated email display
│   └── ui/                           # Shared UI primitives
├── data/
│   ├── mockClients.ts                # 15 mock client records
│   └── mockProperties.ts            # 15 mock property records
└── types/
    ├── client.ts                     # Client, BuyingStage, CommunicationStyle
    ├── property.ts                   # Property, PropertyType
    └── email.ts                      # GeneratedEmail
```

---

## Configuration

### Environment Variables

```bash
# AWS Bedrock (Required for LLM)
AI_AWS_BEDROCK_ACCESS_KEY_ID=***
AI_AWS_BEDROCK_SECRET_ACCESS_KEY=***
AI_AWS_BEDROCK_REGION=us-west-2

# Weather API (Optional - degrades gracefully)
OPENWEATHERMAP_API_KEY=***

# GraphQL API (Optional - falls back to mock data)
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3001/graphql
```

### Dependency Versions

```json
{
	"@langchain/langgraph": "^1.1.2",
	"@langchain/core": "^1.1.17",
	"@langchain/aws": "^1.2.1",
	"@aws-sdk/client-bedrock-runtime": "^3.975.0",
	"@apollo/client": "^3.x",
	"graphql": "^16.x"
}
```

---

## Error Handling

### API Route Errors

```typescript
// Input validation
{
	error: 'clientId is required and must be a string';
} // 400
{
	error: 'propertyId is required and must be a string';
} // 400
{
	error: 'Invalid JSON in request body';
} // 400

// Data lookup
{
	error: 'Client not found with id: xxx';
} // 404
{
	error: 'Property not found with id: xxx';
} // 404

// Generation
{
	error: 'Failed to generate email';
} // 500
{
	error: 'Internal server error while generating email';
} // 500
```

### Node-Level Error Handling

```
inputNormalization: Throws Error if client/property missing → caught by API route
weatherFetch:       Returns { weather_context: null } on failure → prompt says "not available"
contextRetrieval:   Static data, no external calls → cannot fail
promptAssembly:     Throws Error if client/property missing (double-check)
generation:         Catches LLM errors → returns fallback email
postProcessing:     Returns {} if no email to process → passes through
```

### Client-Side Fallback

If the API call fails entirely, `page.tsx` generates a placeholder email client-side using `generatePlaceholderEmail()` and shows an error message: `"(Using placeholder email instead)"`.

---

## Complete Example: Generating an Email

### User Selects:

- **Client**: Sarah Mitchell (enthusiastic, remote worker, budget $450K-$550K)
- **Property**: 123 Oak Street, Austin, TX ($495,000, 3bed/2bath, updated kitchen)
- **Notes**: "She mentioned she's been looking at this neighborhood"

### Step 1: API Route

```typescript
POST /api/generate-email
{
  "clientId": "client-001",
  "propertyId": "prop-001",
  "notes": "She mentioned she's been looking at this neighborhood"
}
```

### Step 2: Data Lookup

```typescript
const client = mockClients.find((c) => c.id === 'client-001'); // Sarah Mitchell
const property = mockProperties.find((p) => p.id === 'prop-001'); // 123 Oak Street
```

### Step 3: Graph Invocation

```typescript
const result = await emailGraph.invoke({
	client, // Sarah Mitchell
	property, // 123 Oak Street
	realtor_notes: "She mentioned she's been looking at this neighborhood",
});
```

### Step 4: Node Execution

**inputNormalization** → Validates inputs, trims notes

**weatherFetch** → Calls OpenWeatherMap for Austin, TX → `{ condition: "Clear", temperature: 78, short_summary: "78°F with clear sky" }`

**contextRetrieval** → Returns static playbook (7 sections of realtor guidelines)

**promptAssembly** → Assembles final prompt:

```
[System] You are an experienced real estate agent...

[User] Write a personalized email...

CLIENT INFORMATION:
Client: Sarah Mitchell
Communication Style: enthusiastic
Preferences: open floor plan, updated kitchen, home office space
...

PROPERTY INFORMATION:
Property: 123 Oak Street
Price: $495,000
...

CURRENT WEATHER: 78°F with clear sky

ADDITIONAL NOTES: She mentioned she's been looking at this neighborhood
```

**generation** → LLM returns:

```
SUBJECT: Sarah, Your Dream Kitchen Awaits on Oak Street!

BODY:
Hi Sarah!

I just came across a property that I couldn't wait to share...
```

**postProcessing** → Word count check (within 300) → passes through unchanged

### Step 5: Response

```json
{
	"subject": "Sarah, Your Dream Kitchen Awaits on Oak Street!",
	"body": "Hi Sarah!\n\nI just came across a property that I couldn't wait to share..."
}
```

---

## Future Considerations

### RAG with Vector Store

The `contextRetrievalNode` currently returns a static playbook document. This is a placeholder for future RAG implementation where client history, property listings, market data, and past email performance could be retrieved from a vector store based on the current client/property context.

### Streaming Responses

The current implementation waits for the full LLM response before returning. Adding streaming would improve UX by showing the email as it generates. LangGraph supports streaming via `.stream()` instead of `.invoke()`.

### Structured Output Validation

Replace regex parsing with LangChain's `.withStructuredOutput()` and a Zod schema:

```typescript
const structuredLlm = llm.withStructuredOutput(
	z.object({
		subject: z.string(),
		body: z.string(),
	}),
);
```

This would eliminate the need for `parseEmailResponse()` and provide guaranteed output structure.

### Modular Prompt Files

Following the Weller Labs pattern, prompts could be extracted to markdown files with variable interpolation, making them easier to version, test, and iterate on independently.

### Conditional Graph Edges

The current pipeline is linear. LangGraph supports conditional edges that could enable:

- Different prompt templates based on buying stage
- Skip weather fetch if property has no location
- Branch to different post-processing based on communication style
- A/B testing different generation strategies

### Multi-Model Tiering

Use different models for different scenarios:

- **Haiku**: Standard email generation (current)
- **Sonnet**: Complex clients with many preferences
- **Opus**: High-value clients in ready_to_offer stage

---

## Summary

This architecture achieves:

- **Explicit Pipeline**: LangGraph StateGraph makes the generation flow visible and debuggable
- **Type Safety**: Annotation-based state with full TypeScript types at every step
- **Resilience**: Graceful degradation at every external dependency (weather, LLM, data source)
- **Extensibility**: Adding nodes, state fields, or conditional branches requires minimal changes
- **Separation of Concerns**: Each node has a single responsibility (validate, fetch, assemble, generate, process)
- **RAG-Ready**: Document pattern and context retrieval node are structured for future vector store integration

The system transforms a client/property selection into a personalized, tone-matched, weather-aware email through a well-defined, type-safe pipeline.
