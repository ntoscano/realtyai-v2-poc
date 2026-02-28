import { Button } from '@/components/ui/button';

interface ModeToggleProps {
	currentMode: 'ai' | 'pvp';
	onSelectMode: (mode: 'ai' | 'pvp') => void;
}

export function ModeToggle({ currentMode, onSelectMode }: ModeToggleProps) {
	return (
		<div className="flex gap-2">
			<Button
				variant={currentMode === 'ai' ? 'default' : 'outline'}
				size="sm"
				onClick={() => onSelectMode('ai')}
			>
				Play vs AI
			</Button>
			<Button
				variant={currentMode === 'pvp' ? 'default' : 'outline'}
				size="sm"
				onClick={() => onSelectMode('pvp')}
			>
				Play vs Human
			</Button>
		</div>
	);
}
