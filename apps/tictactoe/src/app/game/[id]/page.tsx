'use client';

import { GameBoard } from '@/components/GameBoard';
import { GameStatus } from '@/components/GameStatus';
import { NewGameButton } from '@/components/NewGameButton';
import { getGame, makeMove } from '@/lib/api/gameApi';
import type { GameStateDto } from '@/lib/api/gameApi';
import type { Board } from '@/types/game';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function GamePage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const [game, setGame] = useState<GameStateDto | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isAiThinking, setIsAiThinking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const gameId = params.id;

	useEffect(() => {
		async function loadGame() {
			try {
				const data = await getGame(gameId);
				setGame(data);
			} catch (err) {
				if (err instanceof Error && err.message.includes('404')) {
					setError('Game not found');
				} else {
					setError('Failed to load game');
				}
			} finally {
				setIsLoading(false);
			}
		}
		loadGame();
	}, [gameId]);

	const handleCellClick = useCallback(
		async (position: number) => {
			if (!game || game.status !== 'in_progress' || isAiThinking) return;

			const playerToken =
				localStorage.getItem(`playerToken-${gameId}`) ?? undefined;

			if (game.mode === 'ai') {
				setIsAiThinking(true);
			}
			setError(null);

			try {
				const updatedGame = await makeMove(gameId, position, playerToken);
				setGame(updatedGame);
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Failed to make move';
				setError(message);
			} finally {
				setIsAiThinking(false);
			}
		},
		[game, gameId, isAiThinking],
	);

	function handleNewGame() {
		if (game?.mode === 'pvp') {
			router.push('/x');
		} else {
			router.push('/');
		}
	}

	if (isLoading) {
		return (
			<main className="flex min-h-screen items-center justify-center bg-background">
				<p className="text-lg text-muted-foreground">Loading game...</p>
			</main>
		);
	}

	if (!game) {
		return (
			<main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
				<p className="text-lg text-destructive">{error ?? 'Game not found'}</p>
				<NewGameButton onClick={() => router.push('/')} />
			</main>
		);
	}

	const board = game.board as Board;
	const disabled = game.status !== 'in_progress' || isAiThinking;

	return (
		<main className="min-h-screen bg-background p-8">
			<div className="mx-auto flex max-w-md flex-col items-center gap-6">
				<h1 className="text-3xl font-bold">
					{game.mode === 'pvp' ? 'PvP Tic-Tac-Toe' : 'AI Tic-Tac-Toe'}
				</h1>
				<GameStatus
					status={game.status}
					isAiThinking={isAiThinking}
					mode={game.mode}
					currentTurn={game.currentTurn}
				/>
				<GameBoard
					board={board}
					onCellClick={handleCellClick}
					disabled={disabled}
				/>
				{error && <p className="text-sm text-destructive">{error}</p>}
				<NewGameButton onClick={handleNewGame} />
			</div>
		</main>
	);
}
