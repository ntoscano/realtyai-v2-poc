import { cn } from '@/lib/utils';
import { CellValue } from '@/types/game';

interface CellProps {
	value: CellValue;
	position: number;
	onClick: (position: number) => void;
	disabled: boolean;
}

export function Cell({ value, position, onClick, disabled }: CellProps) {
	const isClickable = !value && !disabled;

	return (
		<button
			className={cn(
				'flex h-24 w-24 items-center justify-center border border-border text-4xl font-bold transition-colors',
				isClickable && 'cursor-pointer hover:bg-accent',
				!isClickable && 'cursor-default',
				value === 'X' && 'text-primary',
				value === 'O' && 'text-destructive',
			)}
			onClick={() => isClickable && onClick(position)}
			disabled={!isClickable}
			type="button"
		>
			{value}
		</button>
	);
}
