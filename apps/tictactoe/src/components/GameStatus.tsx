import { cn } from '@/lib/utils';
import { GameStatus as GameStatusType } from '@/types/game';

interface GameStatusProps {
	status: GameStatusType;
	isAiThinking: boolean;
}

export function GameStatus({ status, isAiThinking }: GameStatusProps) {
	if (isAiThinking) {
		return (
			<p className="animate-pulse text-lg font-semibold text-muted-foreground">
				AI is thinking...
			</p>
		);
	}

	const messages: Record<GameStatusType, { text: string; className: string }> =
		{
			in_progress: {
				text: 'Your turn (X)',
				className: 'text-foreground',
			},
			x_wins: {
				text: 'You win!',
				className: 'text-primary',
			},
			o_wins: {
				text: 'AI wins!',
				className: 'text-destructive',
			},
			draw: {
				text: 'It is a draw!',
				className: 'text-muted-foreground',
			},
		};

	const { text, className } = messages[status];

	return <p className={cn('text-lg font-semibold', className)}>{text}</p>;
}
