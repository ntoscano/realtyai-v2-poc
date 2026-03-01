'use client';

import { GameHistoryProvider } from '@/components/GameHistoryContext';
import { GameHistorySidebar } from '@/components/GameHistorySidebar';
import { useGameHistory } from '@/lib/graphql/hooks';

export function AppShell({ children }: { children: React.ReactNode }) {
	const { games, loading, refetch } = useGameHistory();

	return (
		<GameHistoryProvider refetch={refetch}>
			<main className="min-h-screen bg-background p-8">
				<div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
					<div className="md:col-span-2">{children}</div>
					<div className="col-span-1">
						<GameHistorySidebar games={games} loading={loading} />
					</div>
				</div>
			</main>
		</GameHistoryProvider>
	);
}
