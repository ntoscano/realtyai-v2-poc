'use client';

import type { GameSummary } from '@/types/game';
import { useEffect, useState } from 'react';
import { apolloClient } from './client';
import { GET_ALL_GAMES } from './queries';
import { type GraphQLGameNode, transformGameToSummary } from './transforms';

type AllGamesResponse = {
	allGames: {
		nodes: GraphQLGameNode[];
	};
};

export function useGameHistory() {
	const [games, setGames] = useState<GameSummary[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	async function fetchGames() {
		try {
			const result = await apolloClient.query<AllGamesResponse>({
				query: GET_ALL_GAMES,
			});
			if (result.data?.allGames?.nodes) {
				const transformed = result.data.allGames.nodes.map(
					transformGameToSummary,
				);
				setGames(transformed);
			}
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
