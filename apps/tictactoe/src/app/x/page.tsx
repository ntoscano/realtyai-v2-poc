'use client';

import { Button } from '@/components/ui/button';
import { createGame } from '@/lib/api/gameApi';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function PlayerXPage() {
	const router = useRouter();
	const [gameId, setGameId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const creatingRef = useRef(false);

	useEffect(() => {
		if (creatingRef.current) return;
		creatingRef.current = true;

		async function startPvpGame() {
			try {
				const response = await createGame('pvp');
				localStorage.setItem(
					`playerToken-${response.game.id}`,
					response.playerToken,
				);
				setGameId(response.game.id);
			} catch {
				setError('Failed to create PvP game. Please try again.');
				creatingRef.current = false;
			}
		}
		startPvpGame();
	}, []);

	async function handleCopyLink() {
		if (!gameId) return;
		const link = `${window.location.origin}/o?game=${gameId}`;
		await navigator.clipboard.writeText(link);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	function handleGoToGame() {
		if (!gameId) return;
		router.push(`/game/${gameId}`);
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center gap-4">
				<p className="text-lg text-destructive">{error}</p>
				<Button
					onClick={() => {
						setError(null);
						creatingRef.current = false;
						window.location.reload();
					}}
				>
					Try Again
				</Button>
			</div>
		);
	}

	if (!gameId) {
		return (
			<div className="flex items-center justify-center">
				<p className="text-lg text-muted-foreground animate-pulse">
					Creating PvP game...
				</p>
			</div>
		);
	}

	const shareLink = `${
		typeof window !== 'undefined' ? window.location.origin : ''
	}/o?game=${gameId}`;

	return (
		<div className="flex flex-col items-center gap-6">
			<h1 className="text-3xl font-bold">PvP Tic-Tac-Toe</h1>
			<p className="text-muted-foreground">You are Player X</p>

			<div className="w-full rounded-lg border p-4">
				<p className="mb-2 text-sm font-medium">
					Share this link with Player O:
				</p>
				<div className="flex items-center gap-2">
					<code className="flex-1 rounded bg-muted px-3 py-2 text-sm break-all">
						{shareLink}
					</code>
					<Button onClick={handleCopyLink} variant="outline" size="sm">
						{copied ? 'Copied!' : 'Copy'}
					</Button>
				</div>
			</div>

			<Button onClick={handleGoToGame}>Go to Game</Button>
		</div>
	);
}
