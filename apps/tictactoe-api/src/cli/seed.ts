import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import { DataSource } from 'typeorm';
import { getTypeOrmConfig } from '../config/typeorm';
import { Game, CellValue, GameMove, GameStatus } from '../modules/game/game.entity';

// Sample completed games
const sampleGames: Array<{
	boardState: CellValue[];
	status: GameStatus;
	winner: string | null;
	moves: GameMove[];
}> = [
	// Game 1: X wins (diagonal top-left to bottom-right)
	// X | O | X
	// O | X | O
	// . | . | X
	{
		boardState: ['X', 'O', 'X', 'O', 'X', 'O', null, null, 'X'],
		status: 'x_wins',
		winner: 'X',
		moves: [
			{ position: 4, player: 'X', moveNumber: 1 },
			{ position: 1, player: 'O', moveNumber: 2 },
			{ position: 0, player: 'X', moveNumber: 3 },
			{ position: 3, player: 'O', moveNumber: 4 },
			{ position: 2, player: 'X', moveNumber: 5 },
			{ position: 5, player: 'O', moveNumber: 6 },
			{ position: 8, player: 'X', moveNumber: 7 },
		],
	},
	// Game 2: Draw
	// X | O | X
	// X | O | O
	// O | X | X
	{
		boardState: ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'],
		status: 'draw',
		winner: null,
		moves: [
			{ position: 0, player: 'X', moveNumber: 1 },
			{ position: 1, player: 'O', moveNumber: 2 },
			{ position: 2, player: 'X', moveNumber: 3 },
			{ position: 4, player: 'O', moveNumber: 4 },
			{ position: 3, player: 'X', moveNumber: 5 },
			{ position: 5, player: 'O', moveNumber: 6 },
			{ position: 7, player: 'X', moveNumber: 7 },
			{ position: 6, player: 'O', moveNumber: 8 },
			{ position: 8, player: 'X', moveNumber: 9 },
		],
	},
];

async function seed(): Promise<void> {
	console.log('Starting database seed...\n');

	const dataSource = new DataSource(getTypeOrmConfig());

	try {
		await dataSource.initialize();
		console.log('Connected to database\n');

		const gameRepository = dataSource.getRepository(Game);

		// Clear existing data
		console.log('Clearing existing data...');
		await gameRepository.createQueryBuilder().delete().execute();
		console.log('Existing data cleared\n');

		// Seed games
		console.log('Seeding games...');
		for (const sampleGame of sampleGames) {
			const game = gameRepository.create({
				boardState: sampleGame.boardState,
				status: sampleGame.status,
				winner: sampleGame.winner,
				moves: sampleGame.moves,
			});

			const saved = await gameRepository.save(game);
			console.log(`  - Game ${saved.id} (${saved.status})`);
		}
		console.log(`Seeded ${sampleGames.length} games\n`);

		// Verify
		const count = await gameRepository.count();
		console.log(`Verification: ${count} games in database`);
		console.log('\nDatabase seeding complete!');
		console.log('');
		console.log('You can verify the data in GraphiQL at http://localhost:3002/graphql');
		console.log('Try this query:');
		console.log('  { allGames { nodes { id boardState status winner moves createdAt } } }');
	} catch (error) {
		console.error('Seed failed:');
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	} finally {
		await dataSource.destroy();
	}
}

seed();
