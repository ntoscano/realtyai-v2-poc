# PRD: AI Tic-Tac-Toe Game

## Introduction

Build an AI-powered tic-tac-toe game as a reusable reference application within the existing Turborepo monorepo. The player (X) plays against an LLM-powered AI opponent (O) via AWS Bedrock (DeepSeek-R1). The project demonstrates a clean frontend + backend + AI integration pattern using the same stack and conventions as the existing `realty-ai` / `realty-ai-api` apps, serving as a template for future AI-integrated applications.

Two new apps:

- **`apps/tictactoe`** — Next.js 14 frontend (port 2025)
- **`apps/tictactoe-api`** — NestJS backend (port 3002)

## Goals

- Provide a clean, well-structured reference app demonstrating LangGraph + AWS Bedrock AI integration
- Implement a fully playable tic-tac-toe game with deterministic rule enforcement (never trust the LLM for game logic)
- Persist completed games to PostgreSQL via GraphQL (PostGraphile) and display game history
- Follow all existing monorepo patterns (TypeORM entities, PostGraphile GraphQL, Next.js API routes, shadcn/ui components, LangChain pipelines)
- Keep the codebase simple and readable — prioritize clarity over cleverness

## User Stories

### US-001: Backend scaffolding and database setup

**Description:** As a developer, I need the NestJS backend app with PostgreSQL so that game data can be persisted and queried via GraphQL.

**Acceptance Criteria:**

- [ ] `apps/tictactoe-api` created with `package.json`, `tsconfig.json`, `nest-cli.json` following `realty-ai-api` patterns
- [ ] `docker-compose.yml` runs `postgres:16` on port 54322 with database `tictactoe`
- [ ] `.env.local` configured with port 3002 and Postgres connection details
- [ ] Config files created: `postgres.ts`, `typeorm.ts`, `graphile.ts`, `entities.ts` (mirror existing patterns)
- [ ] `app.module.ts` wires TypeORM + PostGraphile (no EmbeddingModule)
- [ ] `app.controller.ts` exposes `GET /` and `GET /health`
- [ ] `pnpm install` succeeds from monorepo root
- [ ] `docker:up` starts PostgreSQL container successfully
- [ ] Typecheck passes

### US-002: Game entity and database migration

**Description:** As a developer, I need a `game` table in PostgreSQL so that completed games can be stored and queried.

**Acceptance Criteria:**

- [ ] `game.entity.ts` created with: `id` (UUID PK), `board_state` (JSONB, 9-element array), `status` (varchar: `in_progress`/`x_wins`/`o_wins`/`draw`), `winner` (varchar, nullable: `X`/`O`/null), `moves` (JSONB array of `{position, player, moveNumber}`), `created_at`, `updated_at`
- [ ] TypeORM migration generated and runs successfully against the Docker database
- [ ] `uuid-ossp` extension enabled in migration
- [ ] Seed script creates 2 sample completed games
- [ ] Typecheck passes

### US-003: Verify GraphQL API via PostGraphile

**Description:** As a developer, I need PostGraphile to auto-generate a working GraphQL API from the `game` table so the frontend can query and mutate game data.

**Acceptance Criteria:**

- [ ] `pnpm run dev` starts backend on port 3002
- [ ] GraphiQL accessible at `http://localhost:3002/graphql`
- [ ] `allGames` query returns seeded games with all fields (boardState, status, winner, moves, createdAt)
- [ ] `createGame` mutation creates a new game record
- [ ] `updateGameById` mutation updates an existing game's boardState, status, winner, and moves
- [ ] CORS enabled for cross-origin requests from frontend

### US-004: Frontend scaffolding

**Description:** As a developer, I need the Next.js frontend app set up with Tailwind, shadcn/ui components, and Apollo Client so I can build the game UI.

**Acceptance Criteria:**

- [ ] `apps/tictactoe` created with `package.json` (port 2025), `tsconfig.json`, `next.config.js`, `postcss.config.js`, `tailwind.config.ts` following `realty-ai` patterns
- [ ] `.env.local` configured with AWS Bedrock credentials and `NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3002/graphql`
- [ ] `globals.css`, `layout.tsx`, `lib/utils.ts` created (copy from realty-ai)
- [ ] shadcn/ui components copied: `button.tsx`, `card.tsx`, `badge.tsx`, `scroll-area.tsx`
- [ ] Apollo Client configured in `lib/graphql/client.ts` pointing to backend
- [ ] `pnpm install` succeeds and `pnpm run dev` starts on port 2025
- [ ] Typecheck passes

### US-005: Game types and deterministic game logic

**Description:** As a developer, I need TypeScript types and pure functions for tic-tac-toe rules so the game is enforced deterministically without relying on the LLM.

**Acceptance Criteria:**

- [ ] `types/game.ts` defines: `CellValue`, `Board` (9-element tuple), `GameMove`, `GameStatus`, `GameState`, `GameSummary`
- [ ] `lib/game/gameLogic.ts` implements pure functions: `checkWinner`, `isBoardFull`, `getAvailablePositions`, `getGameStatus`, `getCurrentTurn`, `isValidMove`, `applyMove`, `createEmptyBoard`, `formatBoardForDisplay`
- [ ] `checkWinner` tests all 8 win lines (3 rows, 3 columns, 2 diagonals)
- [ ] `getGameStatus` returns correct status for wins, draws, and in-progress games
- [ ] All functions are pure (no side effects, immutable board updates)
- [ ] Typecheck passes

### US-006: LangGraph AI move pipeline

**Description:** As a developer, I need a LangGraph pipeline that sends the board state to AWS Bedrock (DeepSeek-R1) and returns the AI's chosen move, with validation and retries.

**Acceptance Criteria:**

- [ ] `lib/ai/llm.ts` creates `ChatBedrockConverse` instance (DeepSeek-R1, temp 0.7, maxTokens 256) — same pattern as `realty-ai/src/lib/ai/llm.ts`
- [ ] `lib/ai/movePrompt.ts` defines `ChatPromptTemplate` with system message ("you are O, respond with ONLY a number 0-8") and user message (board display + available positions)
- [ ] `lib/ai/moveValidator.ts` provides Zod-based validation and `parseMoveResponse()` that strips `<think>` tags and extracts the first digit 0-8
- [ ] `lib/ai/graphState.ts` defines `MoveGraphState` with `Annotation.Root` (board, available_positions, board_display, ai_move)
- [ ] `lib/ai/nodes.ts` implements 3 nodes: `inputValidationNode` (validates board, computes available positions), `moveGenerationNode` (invokes LLM with up to 3 retry attempts), `moveValidationNode` (final legality check)
- [ ] `lib/ai/moveGraph.ts` compiles `StateGraph`: START -> inputValidation -> moveGeneration -> moveValidation -> END
- [ ] Pipeline returns a valid position number when given a valid board state
- [ ] On LLM parse failure, retry includes error feedback in the prompt
- [ ] Typecheck passes

### US-007: AI move API route

**Description:** As a user, when I make a move the frontend needs to request the AI's response via an API endpoint that invokes the LangGraph pipeline.

**Acceptance Criteria:**

- [ ] `POST /api/ai-move` accepts `{ board: CellValue[] }`
- [ ] Validates board is a 9-element array with valid values (null, "X", "O")
- [ ] Returns 400 if game is already over
- [ ] Invokes `moveGraph.invoke({ board })` and returns `{ position: number, board: CellValue[] }`
- [ ] Double-checks returned move is valid before responding (defense in depth)
- [ ] Returns 500 with error message if LLM invocation fails after retries
- [ ] Returns 400 for malformed JSON
- [ ] Typecheck passes

### US-008: Game board UI

**Description:** As a user, I want to see a 3x3 tic-tac-toe board and click cells to place my X so I can play the game.

**Acceptance Criteria:**

- [ ] `Cell.tsx` renders a clickable cell showing X, O, or empty
- [ ] X displayed in primary color, O in destructive/red color
- [ ] Empty cells show hover state when clickable
- [ ] Cells are disabled when occupied, game is over, or AI is thinking
- [ ] `GameBoard.tsx` renders a 3x3 grid of Cell components with visible borders
- [ ] Clicking an empty cell triggers `onCellClick(position)` callback
- [ ] Typecheck passes
- [ ] Verify in browser using dev server

### US-009: Game status display and new game button

**Description:** As a user, I want to see the current game status (my turn, AI thinking, win/loss/draw) and be able to start a new game.

**Acceptance Criteria:**

- [ ] `GameStatus.tsx` shows contextual messages: "Your turn (X)", "AI is thinking..." (with pulse animation), "You win!", "AI wins!", "It's a draw!"
- [ ] Win message shown in primary color, loss in destructive color
- [ ] `NewGameButton.tsx` resets the board to empty and clears game state
- [ ] New game button is always visible (not just after game over)
- [ ] Typecheck passes
- [ ] Verify in browser using dev server

### US-010: Main game page with AI integration

**Description:** As a user, I want to play a complete game of tic-tac-toe against the AI — I click a cell, my X appears, then the AI thinks and places its O.

**Acceptance Criteria:**

- [ ] `page.tsx` is a client component managing `GameState` via `useState`
- [ ] Clicking a cell applies X immediately (optimistic update), then calls `/api/ai-move`
- [ ] After AI response, O is applied to the board
- [ ] Game status checks after both human and AI moves (human could win on their move before AI plays)
- [ ] If game ends (win/draw), no further moves are accepted
- [ ] Error message displayed if AI move request fails; game remains playable
- [ ] Layout: 2-column grid — game area (left/center), history sidebar (right)
- [ ] Typecheck passes
- [ ] Verify in browser: play a full game to completion

### US-011: GraphQL integration and game persistence

**Description:** As a user, I want completed games saved to the backend so my game history persists across sessions.

**Acceptance Criteria:**

- [ ] GraphQL queries defined: `GET_ALL_GAMES` (ordered by CREATED_AT_DESC), `GET_GAME_BY_ID`
- [ ] GraphQL mutations defined: `CREATE_GAME`, `UPDATE_GAME`
- [ ] `transformGameToSummary()` converts GraphQL response to `GameSummary` type
- [ ] When a game ends (win or draw), a `createGame` mutation saves it to the backend
- [ ] Saved game includes final board state, status, winner, and full move history
- [ ] If save fails, game still completes normally on the frontend (error logged, not shown to user)
- [ ] Typecheck passes

### US-012: Game history sidebar

**Description:** As a user, I want to see a sidebar showing my past games with results so I can track my record against the AI.

**Acceptance Criteria:**

- [ ] `useGameHistory()` hook fetches all games from backend on mount, exposes `refetch`
- [ ] `GameHistorySidebar.tsx` displays games in a Card with ScrollArea (max height ~400px)
- [ ] Each `GameHistoryItem.tsx` shows: date/time, move count, and Win/Loss/Draw badge (green/red/gray)
- [ ] Shows "Loading..." while fetching, "No games played yet." when empty
- [ ] History refetches automatically when a game completes
- [ ] Typecheck passes
- [ ] Verify in browser: complete a game and see it appear in the sidebar

## Functional Requirements

- FR-1: Board is a flat 9-element array. Indices 0-8 map left-to-right, top-to-bottom. `null` = empty, `'X'` = human, `'O'` = AI.
- FR-2: Human always plays X and goes first. AI always plays O.
- FR-3: Game rules are enforced deterministically in `gameLogic.ts`. The LLM is never trusted for rule enforcement.
- FR-4: Win detection checks all 8 lines (3 rows, 3 columns, 2 diagonals). Draw detected when board is full with no winner.
- FR-5: AI moves are generated via a LangGraph pipeline (3 nodes) calling AWS Bedrock DeepSeek-R1.
- FR-6: LLM responses are parsed by extracting the first digit 0-8 after stripping `<think>` tags. Invalid responses trigger up to 3 retries with error feedback.
- FR-7: The API route double-checks move validity after the LangGraph pipeline returns (defense in depth).
- FR-8: Games are saved to PostgreSQL via GraphQL only on completion (not per-move).
- FR-9: Game history is displayed in a sidebar, ordered by most recent, showing date, move count, and result badge.
- FR-10: "New Game" button resets the board and allows starting fresh at any time.
- FR-11: Backend exposes auto-generated GraphQL API via PostGraphile from the `game` table.
- FR-12: Frontend shows loading state ("AI is thinking...") with pulse animation while waiting for the LLM response.

## Non-Goals

- No multiplayer / two-human-player mode
- No selectable difficulty levels (LLM plays naturally)
- No game replay or move-by-move history viewer
- No authentication or user accounts
- No per-move persistence to backend (only on game completion)
- No WebSocket real-time updates
- No mobile-specific responsive design (desktop-first is fine)
- No unit test suite (manual verification for this MVP/reference app)

## Design Considerations

- **UI Framework:** Tailwind CSS + shadcn/ui (Button, Card, Badge, ScrollArea) — copied from `apps/realty-ai`
- **Layout:** 2-column grid on desktop. Left: game status + board + new game button (centered). Right: game history sidebar in a Card.
- **Colors:** X in primary color, O in destructive/red. Win badge green (default), loss badge red (destructive), draw badge gray (secondary).
- **AI thinking state:** "AI is thinking..." text with `animate-pulse` CSS class.
- **Board cells:** 96x96px buttons with visible borders, hover highlight on clickable empty cells.

## Technical Considerations

- **Monorepo Integration:** Both apps must be valid Turborepo workspace members. `pnpm install` from root must resolve all dependencies.
- **Existing Patterns to Reuse:**
  - `apps/realty-ai/src/lib/ai/llm.ts` — ChatBedrockConverse setup
  - `apps/realty-ai/src/lib/ai/emailGraph.ts` — StateGraph + node pattern
  - `apps/realty-ai/src/lib/ai/nodes.ts` — retry logic, response parsing
  - `apps/realty-ai/src/app/api/generate-email/route.ts` — API route structure
  - `apps/realty-ai-api/src/modules/property/property.entity.ts` — TypeORM entity pattern
  - `apps/realty-ai-api/src/config/` — all config files (postgres, typeorm, graphile)
  - `apps/realty-ai/src/lib/graphql/` — Apollo Client, queries, hooks pattern
- **Docker:** Separate container on port 54322 to avoid conflicts with existing realty-ai-postgres on 54321.
- **Environment Variables:** Reuses same `AI_AWS_BEDROCK_*` credentials as existing app. New: `NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3002/graphql`.
- **DeepSeek-R1 `<think>` tags:** The model wraps reasoning in `<think>...</think>` tags. The response parser must strip these before extracting the move digit.

## Success Metrics

- A complete game can be played end-to-end: human places X, AI responds with O, game concludes with win/loss/draw
- Completed games persist in the database and appear in the history sidebar
- New game resets cleanly and is immediately playable
- AI responds with a valid move on the first attempt in >90% of games
- The codebase is clean enough to serve as a reference template for future AI-integrated apps
- Both apps start without errors via `pnpm run dev`

## Open Questions

- PostGraphile mutation input types (`CreateGameInput`, `UpdateGameByIdInput`) need to be verified via GraphiQL once the backend is running — field names may differ slightly from expectations
- LLM response latency with DeepSeek-R1 for a simple "pick a number" task is unknown — may need to tune `maxTokens` down further or add a timeout
- Whether PostGraphile's default JSONB handling accepts bare arrays (for `board_state`) or requires wrapping — needs testing
