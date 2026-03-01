'use client';

import { Button } from '@/components/ui/button';
import { joinGame } from '@/lib/api/gameApi';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

function PlayerOContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const gameId = searchParams.get('game');
	const [error, setError] = useState<string | null>(null);
	const joiningRef = useRef(false);

	useEffect(() => {
		if (!gameId) {
			setError('No game ID provided. Please use a valid invite link.');
			return;
		}

		if (joiningRef.current) return;
		joiningRef.current = true;

		const id = gameId;
		async function join() {
			try {
				const response = await joinGame(id);
				localStorage.setItem(
					`playerToken-${response.game.id}`,
					response.playerToken,
				);
				router.push(`/game/${response.game.id}`);
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Unknown error';
				if (message.includes('409')) {
					setError('This game already has two players. You cannot join.');
				} else if (message.includes('404')) {
					setError('Game not found. Please check your invite link.');
				} else if (message.includes('400')) {
					setError('This game is not a PvP game.');
				} else {
					setError('Failed to join game. Please try again.');
				}
				joiningRef.current = false;
			}
		}
		join();
	}, [gameId, router]);

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center gap-4">
				<p className="text-lg text-destructive">{error}</p>
				<Button onClick={() => router.push('/')}>Go Home</Button>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-center">
			<p className="text-lg text-muted-foreground animate-pulse">
				Joining game...
			</p>
		</div>
	);
}

export default function PlayerOPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center">
					<p className="text-lg text-muted-foreground animate-pulse">
						Loading...
					</p>
				</div>
			}
		>
			<PlayerOContent />
		</Suspense>
	);
}
