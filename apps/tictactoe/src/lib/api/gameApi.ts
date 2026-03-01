import type { CellValue, GameMove, GameStatus } from '@/types/game';

export type GameMode = 'ai' | 'pvp';

export interface GameStateDto {
	id: string;
	board: CellValue[];
	status: GameStatus;
	winner: string | null;
	moves: GameMove[];
	mode: GameMode;
	currentTurn: 'X' | 'O';
	createdAt: string;
	updatedAt: string;
}

export interface CreateGameResponse {
	game: GameStateDto;
	playerToken: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
	const res = await fetch(`${API_URL}${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`API error ${res.status}: ${text}`);
	}

	return res.json() as Promise<T>;
}

export async function createGame(mode: GameMode): Promise<CreateGameResponse> {
	return apiFetch<CreateGameResponse>('/api/games', {
		method: 'POST',
		body: JSON.stringify({ mode }),
	});
}

export async function getGame(id: string): Promise<GameStateDto> {
	return apiFetch<GameStateDto>(`/api/games/${id}`);
}

export async function makeMove(
	gameId: string,
	position: number,
	playerToken?: string,
): Promise<GameStateDto> {
	const headers: Record<string, string> = {};
	if (playerToken) {
		headers['X-Player-Token'] = playerToken;
	}

	return apiFetch<GameStateDto>(`/api/games/${gameId}/move`, {
		method: 'POST',
		body: JSON.stringify({ position }),
		headers,
	});
}

export async function joinGame(gameId: string): Promise<CreateGameResponse> {
	return apiFetch<CreateGameResponse>(`/api/games/${gameId}/join`, {
		method: 'POST',
	});
}

export async function listGames(limit?: number): Promise<GameStateDto[]> {
	const query = limit !== undefined ? `?limit=${limit}` : '';
	return apiFetch<GameStateDto[]>(`/api/games${query}`);
}
