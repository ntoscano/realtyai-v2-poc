import { Button } from '@/components/ui/button';

interface NewGameButtonProps {
	onClick: () => void;
}

export function NewGameButton({ onClick }: NewGameButtonProps) {
	return (
		<Button variant="outline" onClick={onClick}>
			New Game
		</Button>
	);
}
