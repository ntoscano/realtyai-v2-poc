# Plan: Secure TicTacToe — Move Business Logic to Backend + 2-Player Support

## Context

Currently all game logic (move validation, state transitions, win detection) lives in the frontend. The backend (`tictactoe-api`) is just PostGraphile auto-generating CRUD — the frontend calls `CREATE_GAME` directly with whatever board state it wants. This is insecure: a malicious client can submit any game result. We need the backend to be the authoritative game engine, and add support for 2-player mode (human vs human on separate machines).

## Architecture After Migration

```
Frontend (thin client)              Backend (game engine + AI)
┌─────────────────────┐            ┌──────────────────────────────────────┐
│  React UI            │            │  NestJS (tictactoe-api, port 3002)  │
│  - Sends move intent │──REST───→ │  GameController (REST /api/games)    │
│    { position: 4 }   │            │  GameService (validation + state)    │
│  - Renders state     │←─────────│  AiService (LangGraph pipeline)      │
│  - WebSocket (PvP)   │←──WS────│  GameGateway (Socket.IO broadcasts)  │
└─────────────────────┘            │  gameLogic.ts (pure functions)       │
                                    │  PostGraphile (read queries only)    │
                                    └──────────────────────────────────────┘
                                                    │
                                               ┌────┴─────┐
                                               │ PostgreSQL│
                                               └──────────┘
```

## URL Routing

| Route          | Mode | Behavior                                                                       |
| -------------- | ---- | ------------------------------------------------------------------------------ |
| `/`            | AI   | Play against LLM. Creates game on load, human is X.                            |
| `/x`           | PvP  | Creates a new PvP game, assigns you as X. Shows shareable `/o?game=<id>` link. |
| `/o?game=<id>` | PvP  | Join an existing PvP game as O.                                                |
| UI toggle      | —    | Switch between modes from either page.                                         |

## Database Schema Changes

New migration adding 3 columns to `game` table:

```sql
ALTER TABLE "game" ADD COLUMN "mode" varchar(10) NOT NULL DEFAULT 'ai';
ALTER TABLE "game" ADD COLUMN "current_turn" varchar(1) NOT NULL DEFAULT 'X';
ALTER TABLE "game" ADD COLUMN "player_x_token" uuid;
ALTER TABLE "game" ADD COLUMN "player_o_token" uuid;
```

- `mode`: `'ai'` or `'pvp'`
- `current_turn`: explicit turn tracking (prevents race conditions vs deriving from board)
- `player_x_token` / `player_o_token`: per-game identity tokens for PvP turn enforcement

**File:** `apps/tictactoe-api/src/modules/game/game.entity.ts` — add these 3 columns

## Backend Changes (`apps/tictactoe-api`)

### New module structure

```
src/
  lib/game/
    gameLogic.ts          ← COPY from frontend (pure functions, zero changes)
    types.ts              ← NEW shared types (CellValue, Board, GameStatus, GameMove, GameMode)
  modules/
    game/
      game.entity.ts      ← UPDATE (add mode, currentTurn, playerXToken, playerOToken)
      game.module.ts      ← NEW
      game.controller.ts  ← NEW (REST endpoints)
      game.service.ts     ← NEW (business logic orchestrator)
      game.gateway.ts     ← NEW (WebSocket for PvP real-time updates)
      dto/
        create-game.dto.ts
        make-move.dto.ts
        game-state.dto.ts
    ai/
      ai.module.ts        ← NEW
      ai.service.ts       ← NEW (wraps moveGraph)
      move-graph.ts       ← MOVE from frontend
      nodes.ts            ← MOVE from frontend
      graph-state.ts      ← MOVE from frontend
      move-validator.ts   ← MOVE from frontend
      llm.ts              ← MOVE from frontend
      move-prompt.ts      ← MOVE from frontend
```

### REST API Endpoints

| Method                     | Path                      | Body                                                                                             | Description |
| -------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------ | ----------- |
| `POST /api/games`          | `{ mode: 'ai' \| 'pvp' }` | Creates game with empty board. Returns game state + `playerToken`.                               |
| `GET /api/games/:id`       | —                         | Returns game state. For PvP joining.                                                             |
| `POST /api/games/:id/move` | `{ position: number }`    | **Core endpoint.** Validates move, applies it, triggers AI if applicable, returns updated state. |
| `POST /api/games/:id/join` | —                         | PvP only. Assigns player O token, returns game state + token.                                    |
| `GET /api/games`           | —                         | List recent games (supplements PostGraphile for history).                                        |

### `GameService.makeMove()` — Core Logic

1. Load game from DB (with `SELECT ... FOR UPDATE` for concurrency)
2. Validate game is `in_progress`
3. Validate `position` via `isValidMove(board, position)`
4. In PvP: validate player token matches current turn's token
5. Apply move: `applyMove(board, position, currentTurn)`
6. Record move in moves array
7. Check game status via `getGameStatus(newBoard)`
8. If game over → update status/winner, save, return
9. If game continues → flip `currentTurn`, save
10. **If AI mode + game still in progress** → call `AiService.generateMove(board)`, apply AI move, check status again, save
11. **If PvP mode** → broadcast update via `GameGateway`
12. Return final `GameStateDto`

### WebSocket Gateway (PvP only) — Socket.IO + Redis Adapter

- Namespace: `/game`
- Client emits `joinGame { gameId }` → joins Socket.IO room `game-<id>`
- Server emits `gameUpdate` with `GameStateDto` after each PvP move
- **Redis adapter** (`@socket.io/redis-adapter`) for horizontal scaling — game updates broadcast across all NestJS instances via Redis pub/sub

### PostGraphile Security — Restrict Mutations via RLS

PostGraphile auto-generates `createGame`/`updateGame` mutations that bypass our game logic. Lock these down:

1. Create a limited PostgreSQL role (e.g., `postgraphile_user`) that PostGraphile connects with
2. `REVOKE INSERT, UPDATE, DELETE ON game FROM postgraphile_user` — PostGraphile can only read
3. The NestJS TypeORM connection uses the existing `postgres` superuser role for writes via `GameService`
4. Keep PostGraphile's `allGames` query available for game history reads
5. Add `GRANT SELECT ON game TO postgraphile_user` explicitly

This means two DB connections: PostGraphile (read-only role) and TypeORM (full-access role).

### New backend dependencies

```
@nestjs/websockets @nestjs/platform-socket.io socket.io @socket.io/redis-adapter ioredis
@langchain/aws @langchain/core @langchain/langgraph zod
```

### AI env vars to add to `apps/tictactoe-api/.env.local`

```
AI_AWS_BEDROCK_ACCESS_KEY_ID=...
AI_AWS_BEDROCK_SECRET_ACCESS_KEY=...
AI_AWS_BEDROCK_REGION=us-east-1
```

## Frontend Changes (`apps/tictactoe`)

### New files

- `src/lib/api/gameApi.ts` — fetch wrapper for REST endpoints (`createGame`, `getGame`, `makeMove`, `joinGame`)
- `src/lib/api/useGameSocket.ts` — React hook wrapping Socket.IO for PvP real-time updates
- `src/app/x/page.tsx` — PvP page for player X (creates game, shows shareable link)
- `src/app/o/page.tsx` — PvP page for player O (joins game from `?game=<id>` query param)
- `src/app/game/[id]/page.tsx` — Unified game board page (loads game by ID, renders board, handles moves via REST)

### Modified files

- `src/app/page.tsx` — Becomes AI-mode page. On load creates AI game, redirects to `/game/:id` (or renders board inline).
- `src/components/GameStatus.tsx` — Add `mode` prop. PvP shows "X's turn" / "O's turn". AI shows "Your turn" / "AI is thinking..."
- `src/components/GameHistoryItem.tsx` — Show game mode label (AI/PvP)

### Removed files

- `src/app/api/ai-move/route.ts` — AI pipeline moves to backend
- `src/lib/ai/` (all 6 files) — moves to backend
- `src/lib/game/gameLogic.ts` — backend is source of truth (keep optionally for optimistic UI)

### Dependency changes

**Remove:** `@langchain/aws`, `@langchain/core`, `@langchain/langgraph`, `zod`
**Add:** `socket.io-client`

## Key Design Decisions

| Decision              | Choice                                         | Rationale                                                                                                                    |
| --------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Real-time mechanism   | WebSocket (Socket.IO) + Redis adapter          | Production-grade, sub-50ms latency, horizontal scaling via Redis pub/sub, bidirectional for future features (chat, presence) |
| PvP URL structure     | `/x` creates game, `/o?game=<id>` joins        | Player X creates + sees shareable link, Player O clicks link to join                                                         |
| PostGraphile security | Restrict via PostgreSQL RLS/roles              | Separate read-only DB role for PostGraphile, full-access role for TypeORM. Prevents mutation bypass.                         |
| Game actions API      | Custom NestJS REST endpoints                   | PostGraphile plugin system is not idiomatic for NestJS. REST controllers are testable and straightforward.                   |
| Turn tracking         | Explicit `current_turn` column                 | Prevents race conditions vs deriving from board state. Works with `SELECT ... FOR UPDATE` for concurrency.                   |
| Player identity (PvP) | Per-game UUID tokens in localStorage           | No full auth needed for POC. Server generates tokens, frontend stores per-gameId.                                            |
| AI response bundling  | Single response includes both human + AI moves | One request, one response. Frontend shows "AI is thinking..." during request.                                                |

## Implementation Phases

### Phase 1: Backend game engine (no frontend changes)

1. Create migration (mode, current_turn, player tokens)
2. Copy `gameLogic.ts` + `types.ts` to backend `src/lib/game/`
3. Create `GameModule` with controller, service, DTOs
4. Implement REST endpoints (create, get, move, join, list)
5. Test with curl — create game, make moves, verify state transitions

### Phase 2: Migrate AI pipeline to backend

6. Install LangGraph deps in tictactoe-api
7. Copy AI files from frontend, adjust imports
8. Create `AiModule` + `AiService`
9. Wire into `GameService.makeMove()` for AI mode
10. Add AWS env vars to backend `.env.local`
11. Test AI mode via curl — create AI game, make move, verify AI counter-move in response

### Phase 3: Frontend refactor (AI mode)

12. Create `gameApi.ts` fetch client
13. Create `/game/[id]/page.tsx` unified game page
14. Update `/page.tsx` for AI mode (create game → navigate to `/game/:id`)
15. Update `handleCellClick` to call REST `makeMove()` instead of local logic
16. Remove AI pipeline files + `/api/ai-move` route from frontend
17. Remove LangGraph deps from frontend `package.json`
18. Test AI mode in browser end-to-end

### Phase 4: 2-player WebSocket support

19. Install `@nestjs/websockets`, `socket.io`, `@socket.io/redis-adapter`, `ioredis` in backend
20. Create `GameGateway` with Redis adapter, wire into `GameService`
21. Install `socket.io-client` in frontend
22. Create `useGameSocket` hook
23. Create `/x/page.tsx` and `/o/page.tsx` (with `?game=<id>` join flow)
24. Update `/game/[id]/page.tsx` to connect WebSocket when PvP
25. Test 2-player in two browser tabs

### Phase 5: Security + Polish

26. Create limited PostgreSQL role for PostGraphile (read-only on `game` table)
27. Update PostGraphile config to use read-only role connection
28. Implement player token validation for PvP
29. Add mode toggle UI
30. Input validation on DTOs (class-validator)
31. WebSocket reconnection handling
32. Update game history sidebar

## Verification

- **AI mode**: Create game at `/`, click cells, verify backend validates + AI responds. Check DB has correct state.
- **PvP mode**: Open `/x` in tab 1, copy link, open `/o?game=<id>` in tab 2. Alternate moves. Verify real-time updates via WebSocket.
- **Security**: Try sending invalid positions, out-of-turn moves, wrong player tokens via curl — all should be rejected.
- **Game history**: Completed games appear in sidebar with correct mode labels.
- **Existing PostGraphile**: `GET_ALL_GAMES` query still works for reading game history.

## Key Reusable Code

- `apps/tictactoe/src/lib/game/gameLogic.ts` — all pure functions copy verbatim to backend
- `apps/tictactoe/src/lib/ai/*.ts` — entire AI pipeline copies to backend with only import path changes
- `apps/tictactoe/src/types/game.ts` — type definitions reused in backend `types.ts`
- `apps/tictactoe/src/lib/graphql/hooks.ts` — `useGameHistory()` pattern for the new `useGameSocket` hook
