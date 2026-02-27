'use client';

import { GameBoard } from '@/components/GameBoard';
import { GameHistorySidebar } from '@/components/GameHistorySidebar';
import { GameStatus } from '@/components/GameStatus';
import { NewGameButton } from '@/components/NewGameButton';
import {
	applyMove,
	createEmptyBoard,
	getGameStatus,
} from '@/lib/game/gameLogic';
import { apolloClient } from '@/lib/graphql/client';
import { useGameHistory } from '@/lib/graphql/hooks';
import { CREATE_GAME } from '@/lib/graphql/mutations';
import type { Board, GameMove, GameState } from '@/types/game';
import { useState } from 'react';

function createInitialState(): GameState {
	return {
		id: null,
		board: createEmptyBoard(),
		status: 'in_progress',
		winner: null,
		moves: [],
		isAiThinking: false,
	};
}

export default function Home() {
	const [gameState, setGameState] = useState<GameState>(createInitialState);
	const [error, setError] = useState<string | null>(null);
	const { games, loading, refetch } = useGameHistory();

	async function saveCompletedGame(
		board: Board,
		status: string,
		winner: string | null,
		moves: GameMove[],
	) {
		try {
			await apolloClient.mutate({
				mutation: CREATE_GAME,
				variables: {
					input: {
						game: {
							boardState: board,
							status,
							winner,
							moves,
						},
					},
				},
			});
			refetch();
		} catch (err) {
			console.error('Failed to save game:', err);
		}
	}

	async function handleCellClick(position: number) {
		if (gameState.status !== 'in_progress' || gameState.isAiThinking) return;

		// Apply human move (X)
		const humanBoard = applyMove(gameState.board, position, 'X');
		const humanMove: GameMove = {
			position,
			player: 'X',
			moveNumber: gameState.moves.length + 1,
		};
		const humanMoves = [...gameState.moves, humanMove];
		const humanStatus = getGameStatus(humanBoard);

		// Check if human won or drew
		if (humanStatus !== 'in_progress') {
			const winner = humanStatus === 'x_wins' ? 'X' : null;
			setGameState({
				...gameState,
				board: humanBoard,
				status: humanStatus,
				winner,
				moves: humanMoves,
			});
			saveCompletedGame(humanBoard, humanStatus, winner, humanMoves);
			return;
		}

		// Set AI thinking state
		setGameState({
			...gameState,
			board: humanBoard,
			moves: humanMoves,
			isAiThinking: true,
		});
		setError(null);

		// Request AI move
		try {
			const response = await fetch('/api/ai-move', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ board: humanBoard }),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error || 'Failed to get AI move');
				setGameState((prev) => ({ ...prev, isAiThinking: false }));
				return;
			}

			const aiBoard = data.board as Board;
			const aiMove: GameMove = {
				position: data.position,
				player: 'O',
				moveNumber: humanMoves.length + 1,
			};
			const aiMoves = [...humanMoves, aiMove];
			const aiStatus = getGameStatus(aiBoard);

			const newState: GameState = {
				...gameState,
				board: aiBoard,
				status: aiStatus,
				winner: aiStatus === 'o_wins' ? 'O' : null,
				moves: aiMoves,
				isAiThinking: false,
			};
			setGameState(newState);

			if (aiStatus !== 'in_progress') {
				saveCompletedGame(
					aiBoard,
					aiStatus,
					aiStatus === 'o_wins' ? 'O' : null,
					aiMoves,
				);
			}
		} catch {
			setError('Failed to connect to AI service');
			setGameState((prev) => ({ ...prev, isAiThinking: false }));
		}
	}

	function handleNewGame() {
		setGameState(createInitialState());
		setError(null);
	}

	return (
		<main className="min-h-screen bg-background p-8">
			<div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
				<div className="flex flex-col items-center gap-6 md:col-span-2">
					<h1 className="text-3xl font-bold">AI Tic-Tac-Toe</h1>
					<GameStatus
						status={gameState.status}
						isAiThinking={gameState.isAiThinking}
					/>
					<GameBoard
						board={gameState.board}
						onCellClick={handleCellClick}
						disabled={
							gameState.status !== 'in_progress' || gameState.isAiThinking
						}
					/>
					{error && <p className="text-sm text-destructive">{error}</p>}
					<NewGameButton onClick={handleNewGame} />
				</div>
				<div className="col-span-1">
					<GameHistorySidebar games={games} loading={loading} />
				</div>
			</div>
		</main>
	);
}
