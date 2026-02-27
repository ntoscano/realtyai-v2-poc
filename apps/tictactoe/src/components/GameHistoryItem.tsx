import { Badge } from '@/components/ui/badge';
import type { GameSummary } from '@/types/game';

interface GameHistoryItemProps {
	game: GameSummary;
}

function getResultBadge(game: GameSummary) {
	if (game.status === 'x_wins') {
		return <Badge variant="default">Win</Badge>;
	}
	if (game.status === 'o_wins') {
		return <Badge variant="destructive">Loss</Badge>;
	}
	return <Badge variant="secondary">Draw</Badge>;
}

export function GameHistoryItem({ game }: GameHistoryItemProps) {
	const date = new Date(game.createdAt).toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});

	return (
		<div className="flex items-center justify-between py-2">
			<div className="flex flex-col">
				<span className="text-sm text-muted-foreground">{date}</span>
				<span className="text-xs text-muted-foreground">
					{game.moveCount} moves
				</span>
			</div>
			{getResultBadge(game)}
		</div>
	);
}
