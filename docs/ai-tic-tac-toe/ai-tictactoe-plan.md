# AI Tic-Tac-Toe Game — Implementation Plan

## Context

Build a new AI tic-tac-toe game within the existing Turborepo monorepo as a learning exercise. The user plays as X against an LLM-powered AI (O). Two new apps: `apps/tictactoe` (Next.js frontend, port 2025) and `apps/tictactoe-api` (NestJS backend, port 3002). Follows all existing patterns from realty-ai/realty-ai-api.

## Architecture Overview

```
User clicks cell → Frontend applies X move → Checks win/draw
  → If game continues: POST /api/ai-move (Next.js API route)
    → LangGraph pipeline invokes AWS Bedrock (DeepSeek-R1)
    → Returns AI's O move → Frontend applies it → Checks win/draw
  → On game end: Save to PostgreSQL via GraphQL (PostGraphile)
  → History sidebar fetches completed games from backend
```

**Key design decisions:**

- Board = flat 9-element array (`[null, 'X', 'O', ...]`), indices 0-8
- Game rules enforced deterministically in `gameLogic.ts` — never by the LLM
- LLM just picks a position number; response parsed and validated with retries
- Games saved to backend only on completion (avoids per-move latency)
- Separate Docker PostgreSQL container on port 54322 (plain `postgres:16`, no pgvector)

---

## Phase 1: Backend — `apps/tictactoe-api`

### Files to create

| File                                   | Based on                                                                                       |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `package.json`                         | `apps/realty-ai-api/package.json` (remove bedrock/embedding deps)                              |
| `tsconfig.json`                        | `apps/realty-ai-api/tsconfig.json` (identical)                                                 |
| `nest-cli.json`                        | `apps/realty-ai-api/nest-cli.json` (identical)                                                 |
| `docker-compose.yml`                   | `apps/realty-ai-api/docker-compose.yml` (port 54322, `postgres:16` image, db name `tictactoe`) |
| `.env.local`                           | Port 3002, Postgres port 54322, db `tictactoe`                                                 |
| `src/main.ts`                          | Same pattern, port 3002                                                                        |
| `src/app.module.ts`                    | Same (TypeORM + PostGraphile), no EmbeddingModule                                              |
| `src/app.controller.ts`                | `GET /` and `GET /health`                                                                      |
| `src/app.service.ts`                   | Simple root/health responses                                                                   |
| `src/config/postgres.ts`               | Same pattern, defaults to port 54322                                                           |
| `src/config/typeorm.ts`                | Same pattern, references local entities                                                        |
| `src/config/graphile.ts`               | Identical to existing                                                                          |
| `src/config/entities.ts`               | Exports `[Game]`                                                                               |
| `src/modules/game/game.entity.ts`      | See schema below                                                                               |
| `src/migrations/{ts}-InitialSchema.ts` | Generated via TypeORM CLI                                                                      |
| `src/cli/seed.ts`                      | Seeds 2 sample completed games                                                                 |

### Game entity schema

```typescript
@Entity('game')
export class Game {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'jsonb', default: [null x9] }) board_state: CellValue[];
  @Column({ type: 'varchar', length: 20, default: 'in_progress' }) status: GameStatus;
  @Column({ type: 'varchar', length: 1, nullable: true }) winner: 'X' | 'O' | null;
  @Column({ type: 'jsonb', default: [] }) moves: GameMove[];  // {position, player, moveNumber}
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
```

PostGraphile auto-generates GraphQL: `allGames`, `gameById`, `createGame`, `updateGameById`.

---

## Phase 2: Frontend — `apps/tictactoe`

### Files to create

| File                                                        | Based on                                                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `package.json`                                              | `apps/realty-ai/package.json` (port 2025, keep langchain/apollo/tailwind/shadcn deps, remove weather/promptfoo) |
| `tsconfig.json`                                             | `apps/realty-ai/tsconfig.json` (identical)                                                                      |
| `next.config.js`, `postcss.config.js`, `tailwind.config.ts` | Copy from realty-ai                                                                                             |
| `.env.local`                                                | Bedrock creds + `NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3002/graphql`                                         |
| `src/app/globals.css`                                       | Copy from realty-ai                                                                                             |
| `src/app/layout.tsx`                                        | Title: "AI Tic-Tac-Toe"                                                                                         |
| `src/lib/utils.ts`                                          | `cn()` utility (copy from realty-ai)                                                                            |
| `src/components/ui/{button,card,badge,scroll-area}.tsx`     | Copy from realty-ai                                                                                             |

### Types — `src/types/game.ts`

- `CellValue = 'X' | 'O' | null`
- `Board` = tuple of 9 CellValues
- `GameMove = { position, player, moveNumber }`
- `GameStatus = 'in_progress' | 'x_wins' | 'o_wins' | 'draw'`
- `GameState = { id, board, status, winner, moves, isAiThinking }`
- `GameSummary = { id, status, winner, moveCount, createdAt }`

### Game logic — `src/lib/game/gameLogic.ts`

Pure deterministic functions (no LLM):

- `checkWinner(board)` — checks all 8 win lines
- `isBoardFull(board)` — draw detection
- `getAvailablePositions(board)` — empty cells
- `getGameStatus(board)` — combines winner + full check
- `getCurrentTurn(board)` — X count vs O count
- `isValidMove(board, position)` — bounds + empty check
- `applyMove(board, position, player)` — immutable update
- `createEmptyBoard()` — 9 nulls
- `formatBoardForDisplay(board)` — text grid for LLM prompt

### AI pipeline — `src/lib/ai/`

| File               | Purpose                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `llm.ts`           | `ChatBedrockConverse` instance (DeepSeek-R1, temp 0.7, maxTokens 256). Reuse pattern from `apps/realty-ai/src/lib/ai/llm.ts`                                      |
| `movePrompt.ts`    | `ChatPromptTemplate` — system: "you are O, respond with ONLY a number 0-8"; user: board display + available positions                                             |
| `moveValidator.ts` | Zod schema validating position is 0-8 and available. `parseMoveResponse()` strips `<think>` tags, extracts first digit                                            |
| `graphState.ts`    | `Annotation.Root` with: board, available_positions, board_display, ai_move                                                                                        |
| `nodes.ts`         | `inputValidationNode` (validate board, compute available positions), `moveGenerationNode` (invoke LLM with retry x3), `moveValidationNode` (final legality check) |
| `moveGraph.ts`     | `StateGraph`: START → inputValidation → moveGeneration → moveValidation → END                                                                                     |

### API route — `src/app/api/ai-move/route.ts`

- POST, accepts `{ board: CellValue[] }`
- Validates board array (length 9, valid values, game not over)
- Invokes `moveGraph.invoke({ board })`
- Double-checks move validity (defense in depth)
- Returns `{ position: number, board: CellValue[] }`

### GraphQL layer — `src/lib/graphql/`

| File            | Purpose                                                      |
| --------------- | ------------------------------------------------------------ |
| `client.ts`     | Apollo Client → `http://localhost:3002/graphql`              |
| `queries.ts`    | `GET_ALL_GAMES` (orderBy: CREATED_AT_DESC), `GET_GAME_BY_ID` |
| `mutations.ts`  | `CREATE_GAME`, `UPDATE_GAME`                                 |
| `transforms.ts` | `transformGameToSummary()` — GraphQL node → `GameSummary`    |
| `hooks.ts`      | `useGameHistory()` — fetches all games, exposes refetch      |

### Components

| Component                | Responsibility                                                  |
| ------------------------ | --------------------------------------------------------------- |
| `Cell.tsx`               | Single board cell, shows X/O/empty, click handler               |
| `GameBoard.tsx`          | 3x3 grid of Cells                                               |
| `GameStatus.tsx`         | Shows "Your turn", "AI thinking...", "You win!", etc.           |
| `NewGameButton.tsx`      | Resets game state                                               |
| `GameHistoryItem.tsx`    | Single history entry with date, move count, win/loss/draw badge |
| `GameHistorySidebar.tsx` | Card with ScrollArea listing GameHistoryItems                   |

### Main page — `src/app/page.tsx`

- `'use client'` with `useState` for `GameState` and `error`
- `useGameHistory()` hook for sidebar data
- `handleCellClick(position)`: apply X → check status → if continuing, call `/api/ai-move` → apply O → check status → if game over, save via GraphQL mutation → refetch history
- `handleNewGame()`: reset to empty board
- Layout: 2-column grid (game area left, history sidebar right)

---

## Implementation Order

1. **Backend scaffolding** — all `tictactoe-api` files, docker-compose, entity, configs
2. **Install + migrate** — `pnpm install`, `docker:up`, generate/run migration, seed
3. **Verify backend** — GraphiQL at `localhost:3002/graphql`, test queries
4. **Frontend scaffolding** — config files, copy UI components, layout, globals
5. **Game logic** — `types/game.ts` + `gameLogic.ts` (pure functions)
6. **AI pipeline** — llm, prompt, validator, state, nodes, graph
7. **API route** — `/api/ai-move/route.ts`
8. **GraphQL layer** — client, queries, mutations, transforms, hooks
9. **Components** — Cell, GameBoard, GameStatus, NewGameButton, GameHistoryItem, GameHistorySidebar
10. **Main page** — wire everything together in `page.tsx`
11. **End-to-end test** — play a full game, verify history

## Verification

1. `cd apps/tictactoe-api && pnpm run docker:up` — PostgreSQL starts on 54322
2. `pnpm run typeorm:migration:run` — game table created
3. `pnpm run dev` — backend on 3002, GraphiQL shows `allGames` query works
4. `cd apps/tictactoe && pnpm run dev` — frontend on 2025
5. Click a cell → X appears → AI thinking animation → O appears
6. Play to completion → result shown → "New Game" button works
7. History sidebar shows completed game with correct Win/Loss/Draw badge
