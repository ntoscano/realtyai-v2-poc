import { Board } from '@/types/game';
import { Cell } from './Cell';

interface GameBoardProps {
	board: Board;
	onCellClick: (position: number) => void;
	disabled: boolean;
}

export function GameBoard({ board, onCellClick, disabled }: GameBoardProps) {
	return (
		<div className="grid grid-cols-3 gap-0">
			{board.map((value, index) => (
				<Cell
					key={index}
					value={value}
					position={index}
					onClick={onCellClick}
					disabled={disabled}
				/>
			))}
		</div>
	);
}
