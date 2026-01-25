import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import { getClient, getConfig } from '../config/postgres';

async function testConnection(): Promise<void> {
	const config = getConfig();
	console.log('Testing database connection with config:');
	console.log(`  Host: ${config.host}`);
	console.log(`  Port: ${config.port}`);
	console.log(`  User: ${config.user}`);
	console.log(`  Database: ${config.database}`);
	console.log('');

	const client = getClient();

	try {
		await client.connect();
		console.log('✅ Successfully connected to database!');

		const result = await client.query('SELECT current_database(), current_user, version()');
		console.log('');
		console.log('Database info:');
		console.log(`  Current database: ${result.rows[0].current_database}`);
		console.log(`  Current user: ${result.rows[0].current_user}`);
		console.log(`  PostgreSQL version: ${result.rows[0].version.split(',')[0]}`);
	} catch (error) {
		console.error('❌ Failed to connect to database:');
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	} finally {
		await client.end();
	}
}

testConnection();
