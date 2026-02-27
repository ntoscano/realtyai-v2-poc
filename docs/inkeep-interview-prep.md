# Inkeep Staff Engineer Interview Prep

> Two-part interview: (1) Whiteboard an architecture for a new AI-powered app (2) Implement it in React/Next.js
> This doc teaches you **how to think through the design**, using your tictactoe project as a worked example.
> For Inkeep-specific architecture (RAG pipeline, widgets, agents), see [inkeep-tech-stack.md](./inkeep-tech-stack.md).

---

## 1. Company Quick Card

|               |                                                                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **What**      | AI agent platform for customer experience — docs search, support copilot, multi-agent orchestration                              |
| **Founded**   | 2023 (YC W23), San Francisco                                                                                                     |
| **Team**      | ~17 people. MIT-heavy. Multiple open-source maintainers (GraphiQL, Chakra UI, Nextra)                                            |
| **CEO**       | Nick Gomez — MIT, ex-Microsoft (developer experience, no-code builders)                                                          |
| **CTO**       | Robert Tran — MIT CS/Math, ex-Head of Eng at illumis (data aggregation from siloed sources)                                      |
| **Funding**   | $13M seed — Khosla Ventures, YC, GreatPoint. Angels: Guillermo Rauch (Vercel CEO), Dan Pinto (Fingerprint), Colin Sidoti (Clerk) |
| **Customers** | Anthropic, Midjourney, PostHog, Postman, Pinecone, Clay, Solana, Clerk, Scale AI, Bun, Resend                                    |
| **Evolution** | Started as RAG docs search → now full multi-agent orchestration platform with no-code builder + TypeScript SDK                   |

**Core values:** "Craft is everything" · "Own it. Ship it." · "Bring clarity" · "Learn through doing" · "Scale is key" · "Build trust"

**What staff-level means here:** Own entire problem spaces end-to-end. "Every engineer has great product intuition and thinks through the end-user experience, from API to SDKs to UIs."

---

## 2. Core Values as Your Interview Compass

Don't just know the values — use them as a decision framework in both interview phases.

| Value                     | Whiteboard Phase                                                                                                                             | Implementation Phase                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **"Craft is everything"** | Sweat API design, edge cases, naming. Ask "what happens when the LLM returns garbage?" before they do.                                       | Clean types, proper error states, polish. Name things precisely (`parseMoveResponse` not `handleOutput`).                        |
| **"Own it. Ship it."**    | Propose complete solutions proactively. Don't wait to be asked about error handling — bring it up yourself.                                  | Get something working fast, then iterate. Start with a hardcoded response, then wire up the real LLM.                            |
| **"Bring clarity"**       | Structure: high-level first, zoom into details. Name every tradeoff explicitly: "We could do X which gives us Y but costs Z."                | Readable code, clear naming, obvious module boundaries. A new engineer should understand your component tree at a glance.        |
| **"Learn through doing"** | Show curiosity — ask about their system. "How does your pipeline handle this case?" Demonstrate you learn by building, not just reading.     | Try things, debug openly, narrate your process. "I'm going to try X first because..."                                            |
| **"Scale is key"**        | Discuss how the design handles 10x traffic, new content types, additional AI models. Where are the extension points?                         | Think about abstraction and reusability. Could this component work in a different context? Is this function pure enough to test? |
| **"Build trust"**         | Discuss observability, validation, graceful failure. "We need traces here." "This layer validates even though the previous one already did." | Type safety, error handling, testability. Defense-in-depth validation. Never trust a single layer.                               |

---

## 3. Whiteboard Phase — How to Architect an AI-Powered App

This section teaches you a **general framework** for designing any AI-integrated app, then walks through your tictactoe project as a concrete worked example.

### 3a. The Framework (use this for any AI app)

When they hand you a whiteboard prompt ("Design an AI-powered X"), follow these steps:

**Step 1: Clarify requirements.**
Who's the user? What's the AI doing? What must be deterministic vs. probabilistic? What's the latency budget? What happens on failure?

**Step 2: Separate concerns.**
Draw four layers and name them: UI layer → API boundary → AI pipeline → persistence. Every piece of logic belongs in exactly one layer.

**Step 3: Draw data flow end-to-end.**
Start with the user action, follow it through every layer, and end with what the user sees. Label each arrow with the data shape (e.g., `{ board: CellValue[9] }`).

**Step 4: Identify where the AI fits (and where it DOESN'T).**
The LLM makes a _suggestion_. Deterministic code enforces _rules_. Never trust the LLM for business logic. This is the single most important architectural principle for AI apps.

**Step 5: Design the AI pipeline.**
Input validation → LLM call → output parsing → output validation. Each step is a discrete node with one job. If a step fails, you know exactly where.

**Step 6: Handle failure.**
Retries with error feedback (inject "your previous response was invalid because X" into the prompt). Fallbacks (random valid move if LLM is down). Graceful degradation (show error, don't crash).

**Step 7: Discuss observability.**
How do you debug when the LLM returns garbage? Log the prompt, the raw response, the parsed result, and the validation outcome. In production: distributed tracing (OpenTelemetry) across the pipeline.

### 3b. Worked Example: Your Tictactoe Architecture

This is the project you built. You know every line. When they ask you to whiteboard an AI app, you can use this as your mental model and adapt it to whatever they throw at you.

#### End-to-end data flow

```
User clicks cell
  → Frontend: applyMove(board, position, 'X') → getGameStatus(board)
  → If game continues:
      POST /api/ai-move { board: CellValue[9] }
        → API route: validates board shape + game status
        → moveGraph.invoke({ board })
            → inputValidation → moveGeneration (LLM + 3 retries) → moveValidation
        → API route: defense-in-depth isValidMove() check
        → Response: { position: number, board: CellValue[9] }
  → Frontend: update state with AI board → getGameStatus()
  → If game over:
      GraphQL createGame mutation → PostgreSQL
  → Sidebar: useGameHistory() → refetch()
```

#### AI pipeline (3-node LangGraph)

```
START → [inputValidation] → [moveGeneration] → [moveValidation] → END
            │                     │                     │
            validates board       calls LLM via         checks isValidMove()
            is still in_progress  ChatBedrockConverse    on the final board
            │                     │                     │
            computes              parses response:      if invalid, throws
            available_positions   parseMoveResponse()   (caught by API route)
            │                     then fallback:
            formats board_display parseMoveFromReasoning()
                                  │
                                  retries up to 3x with
                                  error feedback in prompt
```

#### Component tree

```
page.tsx (state owner — useState<GameState>)
  ├── GameStatus (reads status + isAiThinking)
  ├── GameBoard (reads board, fires onCellClick)
  │     └── Cell x9 (renders X/O/empty, disabled when game over or AI thinking)
  ├── NewGameButton (fires onNewGame → createInitialState())
  └── GameHistorySidebar (reads game history from useGameHistory hook)
        └── GameHistoryItem x N (renders winner badge, move count, timestamp)
```

#### Separation of concerns

```
┌──────────────────┐   ┌────────────────┐   ┌─────────────────────┐
│  React UI         │   │  API Route     │   │  AI Pipeline        │
│  page.tsx         │──→│  /api/ai-move  │──→│  moveGraph          │
│  (presentation    │   │  (boundary +   │   │  (LangGraph:        │
│   + state)        │   │   validation)  │   │   3 nodes)          │
└──────────────────┘   └────────────────┘   └─────────────────────┘
         │                     │                       │
         │              ┌──────────────┐               │
         │              │  gameLogic   │               │
         └─────────────→│  (rules)     │←──────────────┘
                        └──────────────┘
                        deterministic, pure
                        NEVER trusts LLM
                        Both UI and AI pipeline
                        depend on this — single
                        source of truth for rules
```

#### Architecture decisions and WHY

**Why separate game logic from AI?**
The LLM picks a position, but `gameLogic.ts` enforces rules. LLMs are probabilistic — they can return illegal moves, hallucinate, or format output wrong. Deterministic validation is the safety net. In `gameLogic.ts`, every function is pure: `checkWinner(board)` returns a `CellValue`, `isValidMove(board, position)` returns a boolean. No side effects, no LLM dependency, fully testable. This is the same pattern in any AI system: the model _suggests_, deterministic code _validates_. Inkeep does this too — their RAG pipeline retrieves context, but confidence scoring determines whether to show the answer.

**Why a pipeline with discrete nodes?**
`inputValidation → moveGeneration → moveValidation` — each node has one job. If the LLM fails, you know exactly where. You can retry just the generation node with error feedback. You can swap the LLM (DeepSeek → GPT-4 → Claude) without touching validation. You can add nodes (e.g., a "strategy" node that biases toward center/corners) without rewriting the pipeline. This is graph-based orchestration — the same concept behind Inkeep's agent graphs and LangGraph/LangChain's architecture.

**Why retries with error feedback?**
In `moveGenerationNode`, on failure the prompt gets augmented: `"Your previous response was invalid: [errors]. You MUST respond with ONLY a single digit from: [available]"`. The LLM self-corrects on the next attempt. This is a core pattern for any LLM integration — you can't guarantee the first response is valid, so you design for graceful retry. The key insight: retries aren't just "try again" — they include _why_ the last attempt failed, giving the model information to correct itself.

**Why defense-in-depth validation?**
The pipeline's `moveValidationNode` validates the move. Then the API route calls `isValidMove()` again independently. Why both? In production AI systems, you never trust a single validation layer. The pipeline might have a bug. The LLM might find an edge case your parsing didn't handle. Defense-in-depth means a failure in one layer gets caught by the next. Look at the API route — it validates the board shape on input (`isValidBoard`), validates the game status, validates the pipeline output, and validates the final move. Four checks for one request.

**Why frontend as source of truth for in-progress state?**
The game is latency-sensitive — you can't round-trip to the DB for every move. React state (`useState<GameState>`) owns the current game. Save to PostgreSQL only on completion via `saveCompletedGame()`. This is a common pattern for real-time UX + async persistence: optimistic UI with eventual consistency. The tradeoff is that if the tab crashes mid-game, you lose the game state. Acceptable for a game; in a chat widget, you'd persist messages incrementally.

**Why flat array vs. 2D grid for the board?**
The board is `Board = [CellValue x 9]` — a flat 9-element tuple, not a 3x3 matrix. Why? Serialization simplicity: JSON, GraphQL, and LLM prompts all handle flat arrays natively. A single index (0-8) is unambiguous for the LLM — no confusion about `(row, col)` ordering. Win checking uses a constant `WIN_LINES` array of index triples — cleaner than nested loops. The flat representation also makes the type literal: TypeScript enforces exactly 9 elements at the type level.

## 4. Implementation Phase — React/Next.js Patterns

Each pattern below follows the format: **what problem it solves** → **code** → **when to reach for this**.

### Streaming Chat UI (Vercel AI SDK)

**Problem:** You need a chat interface that shows LLM responses word-by-word as they stream. Managing streaming state (loading, messages, input) manually is error-prone.

```typescript
'use client';

import { useChat } from 'ai/react';

export function Chat() {
	const { messages, input, handleInputChange, handleSubmit, isLoading } =
		useChat({
			api: '/api/chat',
		});

	return (
		<div>
			{messages.map((m) => (
				<div
					key={m.id}
					className={m.role === 'user' ? 'text-right' : 'text-left'}
				>
					{m.content}
				</div>
			))}
			<form onSubmit={handleSubmit}>
				<input
					value={input}
					onChange={handleInputChange}
					disabled={isLoading}
				/>
			</form>
		</div>
	);
}
```

**When to reach for this:** Any chat-style interface backed by an LLM. `useChat` handles message history, streaming, loading state, and error handling out of the box.

### API Route with Streaming

**Problem:** The client is streaming, so the server needs to stream too. You need to send LLM tokens as they're generated rather than waiting for the full response.

```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
	const { messages } = await req.json();
	const result = streamText({
		model: openai('gpt-4o'),
		messages,
		system: 'You are a helpful assistant...',
	});
	return result.toDataStreamResponse();
}
```

**When to reach for this:** Any streaming LLM endpoint. `toDataStreamResponse()` handles SSE formatting, backpressure, and connection lifecycle. Pairs with `useChat` on the client.

### Headless + Styled Component Pattern

**Problem:** You need a component that can be themed by consumers (like an embeddable widget). Baking styles in locks consumers into your aesthetic.

```typescript
// Primitive (headless) — handles state, accessibility, keyboard
function SearchBarPrimitive({
	onSubmit,
	children,
}: {
	onSubmit: (query: string) => void;
	children: (props: {
		query: string;
		setQuery: (q: string) => void;
	}) => React.ReactNode;
}) {
	const [query, setQuery] = useState('');
	return (
		<form
			role="search"
			onSubmit={(e) => {
				e.preventDefault();
				onSubmit(query);
			}}
		>
			{children({ query, setQuery })}
		</form>
	);
}

// Styled — applies Tailwind + CVA on top
const StyledSearchBar = (props: {
	onSubmit: (q: string) => void;
	size?: 'sm' | 'md';
}) => (
	<SearchBarPrimitive onSubmit={props.onSubmit}>
		{({ query, setQuery }) => (
			<input
				className={cn(
					'border rounded-md px-3 py-2',
					props.size === 'sm' ? 'h-8' : 'h-10',
				)}
				value={query}
				onChange={(e) => setQuery(e.target.value)}
			/>
		)}
	</SearchBarPrimitive>
);
```

**When to reach for this:** When building components that others embed. Internal app components (like your tictactoe cells) don't need this split — just style them directly.

### CVA Variant Styling

**Problem:** You have a component with multiple visual variants (size, color, state) and the `className` ternaries are getting unreadable.

```typescript
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
	'inline-flex items-center justify-center rounded-md font-medium transition-colors',
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				outline: 'border border-input bg-background hover:bg-accent',
				ghost: 'hover:bg-accent hover:text-accent-foreground',
			},
			size: {
				sm: 'h-8 px-3 text-sm',
				md: 'h-10 px-4',
				lg: 'h-12 px-6 text-lg',
			},
		},
		defaultVariants: { variant: 'default', size: 'md' },
	},
);

// Usage: className={buttonVariants({ variant: 'outline', size: 'lg' })}
```

**When to reach for this:** Any component with 2+ variant dimensions. The shadcn/ui Button, Badge, and Card in your project all use this pattern internally.

### Controlled/Uncontrolled with Imperative Handle

**Problem:** You're building a library component that some consumers want to control (pass `value`/`onChange`) and others want to just drop in (use `defaultValue`). Plus, some consumers need imperative actions like "submit this message programmatically."

```typescript
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { forwardRef, useImperativeHandle } from 'react';

export interface ChatHandle {
	submitMessage: (text: string) => void;
	clearChat: () => void;
}

export const Chat = forwardRef<ChatHandle, ChatProps>(
	({ value, onValueChange, defaultValue = [], ...props }, ref) => {
		const [messages, setMessages] = useControllableState({
			prop: value,
			onChange: onValueChange,
			defaultProp: defaultValue,
		});

		useImperativeHandle(ref, () => ({
			submitMessage: (text) => {
				/* append message, trigger send */
			},
			clearChat: () => setMessages([]),
		}));

		return /* render messages */;
	},
);
```

**When to reach for this:** Library/SDK components that external developers embed. If `value` is provided, the component is controlled. If not, it manages state internally via `defaultValue`. The `ref` handle lets consumers trigger actions without managing state.

### Speed Tips for the Implementation Round

- Start with `npx create-next-app@latest --typescript --tailwind --app`
- Install essentials: `pnpm add ai @ai-sdk/openai class-variance-authority clsx tailwind-merge`
- **Start with types.** Define your data model first (`type Board = [...]`, `interface GameState`). This maps to "Bring clarity" — you're thinking before coding.
- **Build bottom-up:** types → pure logic → API route → components → page
- Keep it working at every step. Hardcode data first, then wire up the real service.
- Use `'use client'` only where needed — interactive components, hooks. Keep layout and data fetching in server components.
- When stuck on syntax: say so and pseudocode. They're evaluating architecture, not memorization.

---

## 5. Product Instincts

Don't memorize these as scripts. Understand the principle, and the right thing to say will follow naturally.

### The Dual-User Problem

**Principle:** Inkeep serves two builders simultaneously — the support manager who configures agents in a visual UI, and the engineer who writes TypeScript. These users have opposing needs: the manager wants no-code simplicity, the engineer wants full programmatic control. The 2-way sync between visual builder and SDK isn't just a feature — it's the architectural foundation. If the builder and SDK diverge, you have two products fighting each other.

**How to signal this:** When discussing any configurable system, ask: "Who configures this? Are there multiple personas? Do they need different interfaces to the same underlying system?" This shows you think about the _people_, not just the code.

### Trust Architecture

**Principle:** For AI products, trust isn't a feature — it's the entire product. Users need to verify answers (citation-linked responses), the system needs to know its own confidence (route low-confidence queries to humans), and "I don't know" must always be preferred over hallucination. PostHog's case study shows 33% auto-resolution — that means 67% still needs humans. The system must know which is which.

**How to signal this:** In your whiteboard design, add confidence scoring as a first-class node, not an afterthought. Show what happens when confidence is low: fallback to sources panel, escalate to human, or show "I don't know." This maps to "Build trust."

### Content Quality = AI Quality

**Principle:** The quality ceiling of any RAG system is the quality of its source content. Garbage in, garbage out — no amount of model tuning compensates for bad docs. The investment: content gap analysis (what are users asking that docs don't cover?), feedback loops (thumbs down → flag for content improvement), and automated docs updates from user interactions. This is a compounding advantage — every interaction makes the next one better.

**How to signal this:** When discussing a RAG system, mention the content pipeline before the model choice. "The model matters less than the content quality" is a contrarian-but-correct take that shows depth.

### Bundle Size as Product Decision

**Principle:** Going from 5.6MB to 101KB wasn't just an engineering win — it's a product decision about respecting the customer's page load time. Every embeddable widget is a guest on someone else's page. If your widget adds 5MB, customers will drop you. The headless → styled → framework wrapper architecture makes this possible without sacrificing customization.

**How to signal this:** When designing an embeddable component, call out bundle size early: "This loads on the customer's page. Every KB is our problem." This maps to "Craft is everything."

### Channel-Aware Design

**Principle:** The same AI agent needs to feel native across channels: docs search bar, Slack bot, Zendesk sidebar, CLI tool. The answer format, tone, length, and interaction model should adapt per channel. A forum answer needs citations and detail. A Slack reply needs to be concise. A CLI response needs to be parseable. One model, many presentation layers.

**How to signal this:** When whiteboarding, draw the channel/presentation layer as a separate concern from the AI pipeline. "The AI generates a structured response; each channel adapter formats it for its medium."

---

## 6. Questions to Ask Them

Pick 3-4. These demonstrate homework and staff-level thinking.

**Architecture:**

- "How does the 2-way sync between the visual builder and TypeScript SDK work? What were the hardest consistency guarantees to maintain?"
- "How do you handle content freshness SLAs across different source types? A GitHub webhook is near-instant but a web crawl might lag hours."
- "What does the embedding model evaluation loop look like? How do you decide when to upgrade or swap models?"

**Product:**

- "What's the biggest gap between what customers expect from AI agents and what the technology can reliably deliver today?"
- "How do you balance the investment between the no-code builder (breadth of adoption) and the SDK (depth of customization)?"
- "PostHog hit 33% auto-resolution. What does it take to get a customer from 33% to 60%?"

**Team/Role:**

- "What does staff-level impact look like at a 17-person company? Is it more about technical architecture or cross-functional leadership?"
- "What's the most important technical decision the team needs to make in the next 6 months?"

---

## 7. Interview Execution Tips

### Whiteboard Round

1. **Start with clarifying questions** before drawing anything. "Who is the user? What's the scale? What's the latency requirement? What must be deterministic?" → Maps to "Bring clarity"
2. **Draw the end-to-end flow first** (high level), then zoom into the component they care most about. Resist the urge to start with details.
3. **Call out tradeoffs explicitly.** "We could do X which gives us Y but costs Z. I'd recommend X because..." → Maps to "Bring clarity"
4. **Mention observability early.** "We need traces here to debug retrieval quality in production." "This node logs the raw LLM response so we can audit failures." → Maps to "Build trust"
5. **Separate the AI from business logic.** "The LLM suggests a move, but deterministic code validates it. We never trust the model for rules enforcement." → Maps to "Build trust"
6. **Think out loud about product implications.** "This design means we can offer self-serve onboarding because..." → Maps to "Own it. Ship it."
7. **Discuss what happens at failure.** Retries, fallbacks, degradation. Don't wait to be asked. → Maps to "Craft is everything"

### Implementation Round

1. **Start with types.** Define the data model before writing any logic. `type Board = [CellValue x 9]`, `interface GameState { ... }`. This shows you think before you code. → Maps to "Bring clarity"
2. **Build bottom-up.** Pure logic functions first (no dependencies, fully testable), then API route, then components, then the page that wires it all together. → Maps to "Craft is everything"
3. **Keep it working at every step.** Hardcode a response, render it, then wire up the real thing. The interviewer should see a running app throughout, not a blank screen for 25 minutes. → Maps to "Own it. Ship it."
4. **Narrate your decisions.** "I'm using `useChat` from Vercel AI SDK because it handles streaming, loading state, and message history." "I'm keeping game rules in a pure function so both the frontend and the AI pipeline can use it." → Maps to "Learn through doing"
5. **If stuck on syntax, pseudocode.** They're evaluating architecture and problem-solving, not memorization. "This function takes the board and returns the available positions — I'll look up the exact reduce syntax in a sec." → Maps to "Own it. Ship it."
6. **Show error handling proactively.** Add a try/catch, handle the loading state, show what happens when the API fails. Before they ask. → Maps to "Build trust"
