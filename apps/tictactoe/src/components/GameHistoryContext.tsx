'use client';

import { createContext, useContext } from 'react';

const GameHistoryContext = createContext<{ refetchHistory: () => void }>({
	refetchHistory: () => {
		throw new Error('GameHistoryProvider not found');
	},
});

export function GameHistoryProvider({
	refetch,
	children,
}: {
	refetch: () => void;
	children: React.ReactNode;
}) {
	return (
		<GameHistoryContext.Provider value={{ refetchHistory: refetch }}>
			{children}
		</GameHistoryContext.Provider>
	);
}

export function useGameHistoryRefetch() {
	return useContext(GameHistoryContext).refetchHistory;
}
