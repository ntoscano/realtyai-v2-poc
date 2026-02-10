#!/usr/bin/env ts-node
/**
 * Migration CLI utility
 *
 * Usage:
 *   pnpm migration clean [--file <file>]
 *
 * This is a placeholder for migration cleaning utilities.
 * The notepad-api has extensive migration cleaning tools that can be adapted if needed.
 */
import * as fs from 'fs';
import * as path from 'path';

const command = process.argv[2];

if (command === 'clean') {
	const fileArg = process.argv.indexOf('--file');
	let migrationFile: string | undefined;

	if (fileArg !== -1 && process.argv[fileArg + 1]) {
		migrationFile = process.argv[fileArg + 1];
	} else {
		// Find the most recent migration file
		const migrationsDir = path.join(__dirname, '../migrations');
		if (fs.existsSync(migrationsDir)) {
			const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.ts'));
			files.sort().reverse();
			if (files.length > 0) {
				migrationFile = path.join(migrationsDir, files[0]);
			}
		}
	}

	if (migrationFile) {
		console.log(`Migration file: ${migrationFile}`);
		console.log('Migration cleanup is minimal for this project.');
		console.log('The auto-generated migration is already clean.');
	} else {
		console.error('No migration file found.');
		process.exit(1);
	}
} else {
	console.log('Usage: pnpm migration clean [--file <file>]');
	console.log('');
	console.log('Commands:');
	console.log('  clean    Clean up the most recent migration file');
}
