import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GameSummary } from '@/types/game';
import { GameHistoryItem } from './GameHistoryItem';

interface GameHistorySidebarProps {
	games: GameSummary[];
	loading: boolean;
}

export function GameHistorySidebar({
	games,
	loading,
}: GameHistorySidebarProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Game History</CardTitle>
			</CardHeader>
			<CardContent>
				{loading ? (
					<p className="text-sm text-muted-foreground">Loading...</p>
				) : games.length === 0 ? (
					<p className="text-sm text-muted-foreground">No games played yet.</p>
				) : (
					<ScrollArea className="h-[400px]">
						<div className="space-y-1">
							{games.map((game) => (
								<GameHistoryItem key={game.id} game={game} />
							))}
						</div>
					</ScrollArea>
				)}
			</CardContent>
		</Card>
	);
}
