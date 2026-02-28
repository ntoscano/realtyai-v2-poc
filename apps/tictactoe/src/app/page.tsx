'use client';

import { GameHistorySidebar } from '@/components/GameHistorySidebar';
import { createGame } from '@/lib/api/gameApi';
import { useGameHistory } from '@/lib/graphql/hooks';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const { games, loading } = useGameHistory();
	const creatingRef = useRef(false);

	useEffect(() => {
		if (creatingRef.current) return;
		creatingRef.current = true;

		async function startGame() {
			try {
				const response = await createGame('ai');
				localStorage.setItem(
					`playerToken-${response.game.id}`,
					response.playerToken,
				);
				router.push(`/game/${response.game.id}`);
			} catch {
				setError('Failed to create game. Please try again.');
				creatingRef.current = false;
			}
		}
		startGame();
	}, [router]);

	return (
		<main className="min-h-screen bg-background p-8">
			<div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
				<div className="flex flex-col items-center gap-6 md:col-span-2">
					<h1 className="text-3xl font-bold">AI Tic-Tac-Toe</h1>
					{error ? (
						<div className="flex flex-col items-center gap-4">
							<p className="text-sm text-destructive">{error}</p>
							<button
								onClick={() => {
									setError(null);
									creatingRef.current = false;
									window.location.reload();
								}}
								className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
							>
								Try Again
							</button>
						</div>
					) : (
						<p className="text-lg text-muted-foreground animate-pulse">
							Creating new game...
						</p>
					)}
				</div>
				<div className="col-span-1">
					<GameHistorySidebar games={games} loading={loading} />
				</div>
			</div>
		</main>
	);
}
