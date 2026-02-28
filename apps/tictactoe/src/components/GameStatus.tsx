import { cn } from '@/lib/utils';
import { GameStatus as GameStatusType } from '@/types/game';

interface GameStatusProps {
	status: GameStatusType;
	isAiThinking: boolean;
	mode?: 'ai' | 'pvp';
	playerSide?: 'X' | 'O';
	currentTurn?: 'X' | 'O';
}

export function GameStatus({
	status,
	isAiThinking,
	mode = 'ai',
	currentTurn = 'X',
}: GameStatusProps) {
	if (isAiThinking) {
		return (
			<p className="animate-pulse text-lg font-semibold text-muted-foreground">
				AI is thinking...
			</p>
		);
	}

	const aiMessages: Record<
		GameStatusType,
		{ text: string; className: string }
	> = {
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

	const pvpMessages: Record<
		GameStatusType,
		{ text: string; className: string }
	> = {
		in_progress: {
			text: `${currentTurn}'s turn`,
			className: 'text-foreground',
		},
		x_wins: {
			text: 'X wins!',
			className: 'text-primary',
		},
		o_wins: {
			text: 'O wins!',
			className: 'text-primary',
		},
		draw: {
			text: 'It is a draw!',
			className: 'text-muted-foreground',
		},
	};

	const messages = mode === 'pvp' ? pvpMessages : aiMessages;
	const { text, className } = messages[status];

	return <p className={cn('text-lg font-semibold', className)}>{text}</p>;
}
