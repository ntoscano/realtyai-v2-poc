import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
} from 'typeorm';

/**
 * Cell value: 'X', 'O', or null (empty)
 */
export type CellValue = 'X' | 'O' | null;

/**
 * A single move in the game
 */
export interface GameMove {
	position: number;
	player: 'X' | 'O';
	moveNumber: number;
}

/**
 * Possible game statuses
 */
export type GameStatus = 'in_progress' | 'x_wins' | 'o_wins' | 'draw';

/**
 * Game mode: AI or Player vs Player
 */
export type GameMode = 'ai' | 'pvp';

@Entity('game')
export class Game {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({
		type: 'jsonb',
		name: 'board_state',
		default: [null, null, null, null, null, null, null, null, null],
	})
	boardState: CellValue[];

	@Column({ type: 'varchar', length: 20, default: 'in_progress' })
	status: GameStatus;

	@Column({ type: 'varchar', length: 1, nullable: true })
	winner: string | null;

	@Column({ type: 'jsonb', default: [] })
	moves: GameMove[];

	@Column({ type: 'varchar', length: 10, default: 'ai' })
	mode: GameMode;

	@Column({ type: 'varchar', length: 1, default: 'X' })
	currentTurn: 'X' | 'O';

	@Column({ type: 'uuid', nullable: true })
	playerXToken: string | null;

	@Column({ type: 'uuid', nullable: true })
	playerOToken: string | null;

	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;
}
