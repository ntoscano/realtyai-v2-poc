'use client';

import { GameBoard } from '@/components/GameBoard';
import { useGameHistoryRefetch } from '@/components/GameHistoryContext';
import { GameStatus } from '@/components/GameStatus';
import { ModeToggle } from '@/components/ModeToggle';
import { NewGameButton } from '@/components/NewGameButton';
import { getGame, makeMove } from '@/lib/api/gameApi';
import type { GameStateDto } from '@/lib/api/gameApi';
import { useGameSocket } from '@/lib/api/useGameSocket';
import type { Board } from '@/types/game';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function GamePage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const [game, setGame] = useState<GameStateDto | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isAiThinking, setIsAiThinking] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const refetchHistory = useGameHistoryRefetch();
	const historyRefetchedRef = useRef(false);

	const gameId = params.id;

	function refetchHistoryOnce() {
		if (historyRefetchedRef.current) return;
		historyRefetchedRef.current = true;
		refetchHistory();
	}

	useGameSocket(game ? gameId : null, game?.mode ?? 'ai', (state) => {
		setGame(state);
		if (state.status !== 'in_progress') {
			refetchHistoryOnce();
		}
	});

	useEffect(() => {
		historyRefetchedRef.current = false;
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

			const previousGame = game;

			// Optimistic update: show player's move immediately
			const optimisticBoard = [...game.board];
			optimisticBoard[position] = game.currentTurn;
			setGame({ ...game, board: optimisticBoard });

			if (game.mode === 'ai') {
				setIsAiThinking(true);
			}
			setError(null);

			try {
				const updatedGame = await makeMove(gameId, position, playerToken);
				setGame(updatedGame);
				if (updatedGame.status !== 'in_progress') {
					refetchHistoryOnce();
				}
			} catch (err) {
				const message =
					err instanceof Error ? err.message : 'Failed to make move';
				setError(message);
				setGame(previousGame);
			} finally {
				setIsAiThinking(false);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
			<div className="flex min-h-[50vh] items-center justify-center">
				<p className="text-lg text-muted-foreground">Loading game...</p>
			</div>
		);
	}

	if (!game) {
		return (
			<div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
				<p className="text-lg text-destructive">{error ?? 'Game not found'}</p>
				<NewGameButton onClick={() => router.push('/')} />
			</div>
		);
	}

	const board = game.board as Board;
	const disabled = game.status !== 'in_progress' || isAiThinking;

	return (
		<div className="flex flex-col items-center gap-6">
			<h1 className="text-3xl font-bold">
				{game.mode === 'pvp' ? 'PvP Tic-Tac-Toe' : 'AI Tic-Tac-Toe'}
			</h1>
			<ModeToggle
				currentMode={game.mode}
				onSelectMode={(mode) => {
					router.push(mode === 'pvp' ? '/x' : '/');
				}}
			/>
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
	);
}
