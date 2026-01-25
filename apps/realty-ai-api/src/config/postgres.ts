import { Client, ClientConfig } from 'pg';

export interface PostgresConfig {
	host: string;
	port: number;
	user: string;
	password: string;
	database: string;
}

export function getConfig(): PostgresConfig {
	return {
		host: process.env.POSTGRES_HOST || 'localhost',
		port: parseInt(process.env.POSTGRES_PORT || '54320', 10),
		user: process.env.POSTGRES_USER || 'postgres',
		password: process.env.POSTGRES_PASSWORD || 'docker',
		database: process.env.POSTGRES_DB || 'realty-ai',
	};
}

export function getAdminConfig(): PostgresConfig {
	const config = getConfig();
	return {
		...config,
		database: 'postgres',
	};
}

export function getClient(config?: PostgresConfig): Client {
	const pgConfig = config || getConfig();
	const clientConfig: ClientConfig = {
		host: pgConfig.host,
		port: pgConfig.port,
		user: pgConfig.user,
		password: pgConfig.password,
		database: pgConfig.database,
	};
	return new Client(clientConfig);
}
