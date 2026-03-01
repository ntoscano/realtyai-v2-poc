'use client';

import { GameBoard } from '@/components/GameBoard';
import { GameStatus } from '@/components/GameStatus';
import { ModeToggle } from '@/components/ModeToggle';
import { NewGameButton } from '@/components/NewGameButton';
import { createGame, makeMove } from '@/lib/api/gameApi';
import type { Board } from '@/types/game';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

const EMPTY_BOARD: Board = [
	null,
	null,
	null,
	null,
	null,
	null,
	null,
	null,
	null,
];

export default function Home() {
	const router = useRouter();
	const [board, setBoard] = useState<Board>(EMPTY_BOARD);
	const [isCreating, setIsCreating] = useState(false);
	const [isAiThinking, setIsAiThinking] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleCellClick = useCallback(
		async (position: number) => {
			if (isCreating) return;

			// Optimistic: show X immediately
			const newBoard: Board = [...EMPTY_BOARD];
			newBoard[position] = 'X';
			setBoard(newBoard);

			setIsCreating(true);
			setIsAiThinking(true);
			setError(null);

			try {
				const response = await createGame('ai');
				localStorage.setItem(
					`playerToken-${response.game.id}`,
					response.playerToken,
				);
				await makeMove(response.game.id, position, response.playerToken);
				router.push(`/game/${response.game.id}`);
			} catch {
				setBoard(EMPTY_BOARD);
				setIsCreating(false);
				setIsAiThinking(false);
				setError('Failed to start game. Please try again.');
			}
		},
		[router, isCreating],
	);

	return (
		<div className="flex flex-col items-center gap-6">
			<h1 className="text-3xl font-bold">AI Tic-Tac-Toe</h1>
			<ModeToggle
				currentMode="ai"
				onSelectMode={(mode) => {
					if (mode === 'pvp') router.push('/x');
				}}
			/>
			<GameStatus
				status="in_progress"
				isAiThinking={isAiThinking}
				mode="ai"
				currentTurn="X"
			/>
			<GameBoard
				board={board}
				onCellClick={handleCellClick}
				disabled={isCreating}
			/>
			{error && <p className="text-sm text-destructive">{error}</p>}
			<NewGameButton onClick={() => window.location.reload()} />
		</div>
	);
}
