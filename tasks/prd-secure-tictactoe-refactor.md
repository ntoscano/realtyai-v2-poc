# PRD: Secure TicTacToe — Backend Game Engine + 2-Player Support

## Introduction

The TicTacToe app currently runs all game logic (move validation, state transitions, win detection) on the frontend. The backend (`tictactoe-api`) is a pass-through — PostGraphile auto-generates CRUD, and the frontend calls `CREATE_GAME` with arbitrary board state. A malicious client can submit any game result.

This refactor makes the NestJS backend the authoritative game engine. The frontend becomes a thin client that sends move intents (`{ position: 4 }`) and renders server-validated state. Additionally, we add 2-player mode where two humans on separate machines play against each other via WebSocket real-time updates.

Both goals are co-equal: security (backend authority) and multiplayer (PvP with WebSocket).

## Goals

- Make the backend the single source of truth for game state — no client-supplied board states are ever trusted
- Validate every move server-side: correct turn, valid position, game not over
- Migrate the AI pipeline (LangGraph) from the Next.js frontend to the NestJS backend
- Support 2-player mode (human vs human) with real-time move updates via WebSocket (Socket.IO + Redis adapter)
- Restrict PostGraphile to read-only access via PostgreSQL role-based permissions
- Support URL-based mode selection: `/` (AI), `/x` (create PvP), `/o?game=<id>` (join PvP)
- Add Redis to Docker infrastructure for Socket.IO horizontal scaling

## User Stories

### US-001: Database schema migration

**Description:** As a developer, I need the `game` table to support game mode, turn tracking, and player identity so the backend can enforce game rules.

**Acceptance Criteria:**

- [ ] New migration adds columns: `mode` (varchar, default 'ai'), `current_turn` (varchar, default 'X'), `player_x_token` (uuid, nullable), `player_o_token` (uuid, nullable)
- [ ] Existing game data is truncated (fresh start for dev environment)
- [ ] `game.entity.ts` updated with new columns and TypeScript types
- [ ] Migration runs successfully: `pnpm typeorm:migration:run`
- [ ] Typecheck passes

### US-002: Copy game logic to backend

**Description:** As a developer, I need the pure game logic functions available in the backend so the `GameService` can validate moves and compute state transitions.

**Acceptance Criteria:**

- [ ] `src/lib/game/gameLogic.ts` created in `tictactoe-api` — copied verbatim from frontend `apps/tictactoe/src/lib/game/gameLogic.ts`
- [ ] `src/lib/game/types.ts` created with shared types: `CellValue`, `Board`, `GameStatus`, `GameMove`, `GameMode`
- [ ] Imports updated to use co-located `types.ts` (no `@/` aliases)
- [ ] All pure functions available: `checkWinner`, `isBoardFull`, `getAvailablePositions`, `getGameStatus`, `getCurrentTurn`, `isValidMove`, `applyMove`, `createEmptyBoard`, `formatBoardForDisplay`
- [ ] Typecheck passes

### US-003: Create game REST endpoint

**Description:** As a frontend client, I want to create a new game via `POST /api/games` so the backend initializes and tracks the game.

**Acceptance Criteria:**

- [ ] `GameModule` created with `GameController`, `GameService`, and DTOs (`CreateGameDto`, `GameStateDto`)
- [ ] `GameModule` registered in `AppModule`
- [ ] `POST /api/games` accepts `{ mode: 'ai' | 'pvp' }` body
- [ ] Creates game in DB: empty board, status `in_progress`, `current_turn` = 'X', mode from request
- [ ] Generates and stores `player_x_token` (UUID) for the creating player
- [ ] Returns `GameStateDto` with game state + `playerToken`
- [ ] Returns 400 for invalid mode values
- [ ] Testable via curl: `curl -X POST localhost:3002/api/games -H 'Content-Type: application/json' -d '{"mode":"ai"}'`
- [ ] Typecheck passes

### US-004: Get game state endpoint

**Description:** As a frontend client, I want to fetch the current game state via `GET /api/games/:id` so I can render the board.

**Acceptance Criteria:**

- [ ] `GET /api/games/:id` returns `GameStateDto` with id, board, status, winner, moves, mode, currentTurn, createdAt, updatedAt
- [ ] Returns 404 for non-existent game IDs
- [ ] Does NOT expose player tokens in the response
- [ ] Typecheck passes

### US-005: Make move endpoint (core game logic)

**Description:** As a player, I want to submit a move via `POST /api/games/:id/move` so the backend validates and applies it, returning the updated game state.

**Acceptance Criteria:**

- [ ] `POST /api/games/:id/move` accepts `{ position: number }` body and `X-Player-Token` header
- [ ] Loads game with `SELECT ... FOR UPDATE` (pessimistic lock for concurrency)
- [ ] Rejects if game is not `in_progress` (400)
- [ ] Rejects if position is not valid via `isValidMove()` (400)
- [ ] Applies move via `applyMove(board, position, currentTurn)`
- [ ] Records move in moves array with correct `moveNumber`
- [ ] Checks game status via `getGameStatus()`
- [ ] If game over: updates status and winner, saves, returns final state
- [ ] If game continues: flips `currentTurn`, saves, returns updated state
- [ ] Returns 404 for non-existent game ID
- [ ] Testable via curl: sequential moves with position 0, 1, 2, etc.
- [ ] Typecheck passes

### US-006: AI move integration in make-move endpoint

**Description:** As a player in AI mode, after I submit my move the backend should automatically trigger the AI pipeline and return both my move and the AI's counter-move in a single response.

**Acceptance Criteria:**

- [ ] After applying human move in AI mode, if game is still `in_progress`, calls `AiService.generateMove(board)`
- [ ] AI move is applied to the board, recorded in moves array, status rechecked
- [ ] `currentTurn` flips back to 'X' after AI move (or stays on final status if game ends)
- [ ] Response includes both human and AI moves in the moves array
- [ ] Returns 500 with descriptive error if AI pipeline fails after retries
- [ ] Typecheck passes

### US-007: Migrate AI pipeline to backend

**Description:** As a developer, I need the LangGraph AI pipeline running in the NestJS backend so the `GameService` can trigger it after validating a human move.

**Acceptance Criteria:**

- [ ] Install LangGraph dependencies in `tictactoe-api`: `@langchain/aws`, `@langchain/core`, `@langchain/langgraph`, `zod`
- [ ] `AiModule` and `AiService` created in `src/modules/ai/`
- [ ] AI files copied from frontend and imports adjusted: `move-graph.ts`, `nodes.ts`, `graph-state.ts`, `move-validator.ts`, `llm.ts`, `move-prompt.ts`
- [ ] `AiService.generateMove(board)` invokes `moveGraph`, validates result, returns position
- [ ] Defense-in-depth: `isValidMove()` check on AI's returned position
- [ ] AWS Bedrock env vars added to `apps/tictactoe-api/.env.local`: `AI_AWS_BEDROCK_ACCESS_KEY_ID`, `AI_AWS_BEDROCK_SECRET_ACCESS_KEY`, `AI_AWS_BEDROCK_REGION`
- [ ] `AiModule` exported and imported by `GameModule`
- [ ] Testable via curl: create AI game, make a move, response includes AI counter-move
- [ ] Typecheck passes

### US-008: List games endpoint

**Description:** As a frontend client, I want to list recent games via `GET /api/games` so I can display game history.

**Acceptance Criteria:**

- [ ] `GET /api/games` returns array of `GameStateDto` ordered by `createdAt` descending
- [ ] Supports optional `?limit=N` query param (default 20)
- [ ] Typecheck passes

### US-009: Join PvP game endpoint

**Description:** As Player O, I want to join an existing PvP game via `POST /api/games/:id/join` so I receive my player token and can start making moves.

**Acceptance Criteria:**

- [ ] `POST /api/games/:id/join` generates and stores `player_o_token`, returns game state + token
- [ ] Rejects if game mode is not `pvp` (400)
- [ ] Rejects if Player O has already joined (409 Conflict)
- [ ] Returns 404 for non-existent game ID
- [ ] Typecheck passes

### US-010: PvP player token validation

**Description:** As the backend, I need to validate that the player making a move in PvP mode is the correct player for the current turn, preventing one player from moving for the other.

**Acceptance Criteria:**

- [ ] In PvP mode, `POST /api/games/:id/move` requires `X-Player-Token` header
- [ ] If `currentTurn` is 'X', token must match `player_x_token`
- [ ] If `currentTurn` is 'O', token must match `player_o_token`
- [ ] Returns 403 if token is missing or does not match
- [ ] AI mode does not require token validation (human is always X)
- [ ] Typecheck passes

### US-011: Frontend API client

**Description:** As a frontend developer, I need a fetch-based API client to replace direct game logic calls with backend REST calls.

**Acceptance Criteria:**

- [ ] `src/lib/api/gameApi.ts` created with functions: `createGame(mode)`, `getGame(id)`, `makeMove(gameId, position, playerToken?)`, `joinGame(gameId)`, `listGames()`
- [ ] Uses `NEXT_PUBLIC_API_URL` env var (default `http://localhost:3002`)
- [ ] Includes `X-Player-Token` header when `playerToken` is provided
- [ ] Throws descriptive errors on non-ok responses
- [ ] Typecheck passes

### US-012: Unified game board page

**Description:** As a player, I want a `/game/:id` page that loads the game by ID, renders the board, and handles moves via the REST API.

**Acceptance Criteria:**

- [ ] `src/app/game/[id]/page.tsx` created
- [ ] On mount: fetches game state via `getGame(params.id)`
- [ ] Renders `GameBoard`, `GameStatus`, `NewGameButton` components
- [ ] On cell click: calls `makeMove(gameId, position, playerToken)`, updates local state from response
- [ ] In AI mode: shows "AI is thinking..." spinner while `makeMove` request is in-flight
- [ ] Stores `playerToken` in localStorage keyed by `gameId`
- [ ] Handles error states (game not found, invalid move, server error)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-013: AI mode landing page

**Description:** As a player visiting `/`, I want to immediately start a game against the AI.

**Acceptance Criteria:**

- [ ] `src/app/page.tsx` refactored: on load calls `createGame('ai')`, navigates to `/game/:id`
- [ ] Stores returned `playerToken` in localStorage
- [ ] Game history sidebar remains visible
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-014: PvP Player X page (`/x`)

**Description:** As Player X, I want to visit `/x` to create a new PvP game and see a shareable link for Player O.

**Acceptance Criteria:**

- [ ] `src/app/x/page.tsx` created
- [ ] On load: calls `createGame('pvp')`, stores `playerToken` in localStorage
- [ ] Displays shareable link: `/o?game=<id>` with copy-to-clipboard button
- [ ] Navigates to `/game/:id` (or renders board inline after link is shown)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-015: PvP Player O page (`/o`)

**Description:** As Player O, I want to visit `/o?game=<id>` to join an existing PvP game.

**Acceptance Criteria:**

- [ ] `src/app/o/page.tsx` created
- [ ] Reads `game` query param from URL
- [ ] Calls `joinGame(gameId)`, stores returned `playerToken` in localStorage
- [ ] Navigates to `/game/:id`
- [ ] Shows error if no `game` param provided or game not found
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-016: Add Redis to Docker infrastructure

**Description:** As a developer, I need Redis running locally via Docker so the Socket.IO adapter can use it for horizontal scaling.

**Acceptance Criteria:**

- [ ] Redis service added to `apps/tictactoe-api/docker-compose.yml`: `redis:7-alpine`, port 6379
- [ ] Redis connection config added to backend env vars: `REDIS_HOST`, `REDIS_PORT`
- [ ] `docker-compose up -d` starts both PostgreSQL and Redis
- [ ] Redis accessible at `localhost:6379`

### US-017: WebSocket gateway for PvP real-time updates

**Description:** As a PvP player, I want to see my opponent's moves in real-time without refreshing the page.

**Acceptance Criteria:**

- [ ] Install `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io`, `@socket.io/redis-adapter`, `ioredis` in backend
- [ ] `GameGateway` created with `@WebSocketGateway({ namespace: '/game', cors: { origin: '*' } })`
- [ ] Gateway configured with Redis adapter for multi-instance broadcasting
- [ ] Client `joinGame { gameId }` event joins Socket.IO room `game-<gameId>`
- [ ] `GameService` calls `gateway.broadcastGameUpdate(gameId, state)` after each PvP move
- [ ] Server emits `gameUpdate` event with `GameStateDto` to the game room
- [ ] Typecheck passes

### US-018: Frontend WebSocket hook for PvP

**Description:** As a PvP player, my game page should connect to WebSocket and update the board when my opponent moves.

**Acceptance Criteria:**

- [ ] Install `socket.io-client` in frontend
- [ ] `src/lib/api/useGameSocket.ts` hook created
- [ ] Hook connects to `/game` namespace when `gameId` is provided and mode is `pvp`
- [ ] Emits `joinGame { gameId }` on connect
- [ ] Listens for `gameUpdate` events and calls `onUpdate` callback with new state
- [ ] Cleans up socket connection on unmount
- [ ] `/game/[id]/page.tsx` uses `useGameSocket` in PvP mode to receive opponent moves
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill: open two tabs, make moves, verify real-time updates

### US-019: PostGraphile read-only security

**Description:** As a developer, I need PostGraphile restricted to read-only access so clients cannot bypass the `GameService` by calling auto-generated mutations directly.

**Acceptance Criteria:**

- [ ] New PostgreSQL role `postgraphile_user` created via migration
- [ ] `GRANT SELECT ON game TO postgraphile_user` applied
- [ ] `REVOKE INSERT, UPDATE, DELETE ON game FROM postgraphile_user` applied
- [ ] PostGraphile config updated to connect with `postgraphile_user` credentials
- [ ] TypeORM continues using `postgres` superuser for full read/write access
- [ ] `allGames` GraphQL query still works
- [ ] `createGame` / `updateGameById` GraphQL mutations return permission error
- [ ] Typecheck passes

### US-020: Remove frontend AI pipeline and game logic

**Description:** As a developer, I need to remove the AI pipeline and direct game logic from the frontend since the backend is now the source of truth.

**Acceptance Criteria:**

- [ ] `src/app/api/ai-move/route.ts` deleted
- [ ] `src/lib/ai/` directory deleted (all 6 files: `moveGraph.ts`, `nodes.ts`, `graphState.ts`, `moveValidator.ts`, `llm.ts`, `movePrompt.ts`)
- [ ] `src/lib/game/gameLogic.ts` deleted (or kept with clear comment "optimistic UI only, server is authoritative")
- [ ] Frontend `package.json`: `@langchain/aws`, `@langchain/core`, `@langchain/langgraph`, `zod` removed
- [ ] Frontend `package.json`: `socket.io-client` added
- [ ] No broken imports — all references to removed files are updated
- [ ] Typecheck passes
- [ ] App builds successfully: `pnpm build`

### US-021: Game status component mode support

**Description:** As a player, I want the game status display to adapt based on game mode (AI vs PvP).

**Acceptance Criteria:**

- [ ] `GameStatus` component accepts `mode` and optional `playerSide` props
- [ ] AI mode: "Your turn (X)" / "AI is thinking..." / "You win!" / "AI wins!" / "It's a draw!"
- [ ] PvP mode: "X's turn" / "O's turn" / "X wins!" / "O wins!" / "It's a draw!"
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-022: Mode toggle UI

**Description:** As a player, I want a UI toggle to switch between AI and PvP modes without manually editing the URL.

**Acceptance Criteria:**

- [ ] Toggle or button group visible on the landing/game pages: "Play vs AI" / "Play vs Human"
- [ ] Selecting "Play vs AI" navigates to `/` (creates new AI game)
- [ ] Selecting "Play vs Human" navigates to `/x` (creates new PvP game)
- [ ] Current mode visually highlighted
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-023: Game history sidebar with mode labels

**Description:** As a player, I want the game history sidebar to show whether each game was AI or PvP.

**Acceptance Criteria:**

- [ ] `GameHistoryItem` component displays mode badge: "AI" or "PvP"
- [ ] Game history fetched via `GET /api/games` REST endpoint (replacing or supplementing PostGraphile query)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: The backend validates every move server-side — position validity, turn correctness, game status
- FR-2: The frontend never sends board state — only move intent (`{ position: number }`)
- FR-3: In AI mode, `POST /api/games/:id/move` returns both the human and AI moves in a single response
- FR-4: In PvP mode, after a valid move, the backend broadcasts the updated state via WebSocket to all clients in the game room
- FR-5: PvP turn enforcement uses per-game UUID tokens — Player X cannot move when it's Player O's turn
- FR-6: Game creation assigns a `playerToken` returned only to the creating client
- FR-7: PostGraphile mutations (createGame, updateGame) are blocked via PostgreSQL role permissions
- FR-8: PostGraphile read queries (allGames) remain available for game history
- FR-9: Redis is available via Docker for Socket.IO adapter horizontal scaling
- FR-10: The AI pipeline (LangGraph with DeepSeek-R1) runs exclusively in the NestJS backend
- FR-11: Concurrent move requests in PvP are serialized via `SELECT ... FOR UPDATE` on the game row
- FR-12: URL routing: `/` = AI mode, `/x` = create PvP as X, `/o?game=<id>` = join PvP as O

## Non-Goals

- No user authentication system (OAuth, JWT sessions) — per-game tokens are sufficient
- No matchmaking or game lobby — Player X shares a link manually
- No spectator mode
- No chat or messaging between players
- No game replay or move-by-move playback
- No mobile-specific UI optimizations
- No deployment or CI/CD pipeline changes
- No automated testing (unit/integration) — manual curl + browser verification

## Technical Considerations

- **NestJS v8**: Backend uses NestJS 8.x. `@WebSocketGateway` and `@nestjs/websockets` are stable at this version.
- **PostGraphile v4**: The `postgraphile-nest` package wraps PostGraphile v4. The read-only role approach avoids needing PostGraphile plugins.
- **TypeORM with SnakeNamingStrategy**: New entity columns use camelCase in TypeScript, auto-converted to snake_case in PostgreSQL.
- **LangGraph dependencies**: The AI pipeline uses `@langchain/langgraph`, `@langchain/aws` (Bedrock), `@langchain/core`. These move from the frontend `package.json` to the backend.
- **Socket.IO + Redis adapter**: `@socket.io/redis-adapter` with `ioredis` for pub/sub across NestJS instances.
- **Existing pure functions**: `gameLogic.ts` functions (`applyMove`, `checkWinner`, `getGameStatus`, `isValidMove`, etc.) are pure with zero dependencies — copy verbatim to backend.
- **Concurrency**: `SELECT ... FOR UPDATE` on the game row prevents two simultaneous moves from corrupting state in PvP.
- **Environment**: AWS Bedrock credentials must be added to `apps/tictactoe-api/.env.local`.

## Success Metrics

- All moves validated server-side — no client-supplied board states accepted
- AI mode works end-to-end: user clicks cell, backend validates + runs AI pipeline, frontend renders result
- PvP mode works across two browser tabs: alternating moves with sub-1s real-time updates
- Invalid moves (wrong turn, occupied cell, game over) rejected with appropriate HTTP error codes
- PostGraphile `createGame`/`updateGame` mutations return permission denied errors
- Game history sidebar displays completed games with correct mode labels

## Open Questions

- Should we add a timeout for PvP games (auto-forfeit if a player doesn't move within N minutes)?
- Should the AI difficulty be configurable (e.g., temperature parameter exposed to the user)?
- Should we add a "rematch" feature that creates a new game with the same opponent?
- Should we persist the player token server-side (cookie/session) instead of relying on localStorage?
