import type {
	CellValue,
	GameMode,
	GameMove,
	GameStatus,
	GameSummary,
} from '@/types/game';

export type GraphQLGameNode = {
	id: string;
	boardState: CellValue[];
	status: string;
	winner: string | null;
	moves: GameMove[];
	mode: string;
	createdAt: string;
};

export function transformGameToSummary(node: GraphQLGameNode): GameSummary {
	return {
		id: node.id,
		status: node.status as GameStatus,
		winner: (node.winner as CellValue) ?? null,
		moveCount: node.moves?.length ?? 0,
		mode: (node.mode as GameMode) ?? 'ai',
		createdAt: node.createdAt,
	};
}
