'use client';

import type { GameStateDto } from '@/lib/api/gameApi';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';

export function useGameSocket(
	gameId: string | null,
	mode: 'ai' | 'pvp',
	onUpdate: (state: GameStateDto) => void,
) {
	const socketRef = useRef<Socket | null>(null);
	const onUpdateRef = useRef(onUpdate);
	onUpdateRef.current = onUpdate;

	useEffect(() => {
		if (mode !== 'pvp' || !gameId) return;

		const socket = io(`${API_URL}/game`, {
			transports: ['websocket'],
		});
		socketRef.current = socket;

		socket.on('connect', () => {
			socket.emit('joinGame', { gameId });
		});

		socket.on('gameUpdate', (state: GameStateDto) => {
			onUpdateRef.current(state);
		});

		return () => {
			socket.disconnect();
			socketRef.current = null;
		};
	}, [gameId, mode]);
}
