'use client';

import { listGames } from '@/lib/api/gameApi';
import type { GameMode, GameSummary } from '@/types/game';
import { useEffect, useState } from 'react';

export function useGameHistory() {
	const [games, setGames] = useState<GameSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	async function fetchGames() {
		try {
			const results = await listGames();
			const summaries: GameSummary[] = results.map((g) => ({
				id: g.id,
				status: g.status,
				winner: g.winner as GameSummary['winner'],
				moveCount: g.moves?.length ?? 0,
				mode: g.mode as GameMode,
				createdAt: g.createdAt,
			}));
			setGames(summaries);
		} catch (err) {
			setError(err instanceof Error ? err : new Error('Failed to fetch games'));
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		fetchGames();
	}, []);

	return { games, loading, error, refetch: fetchGames };
}
