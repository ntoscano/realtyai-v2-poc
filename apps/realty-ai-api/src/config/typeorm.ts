import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { getConfig } from './postgres';
import { entities } from './entities';

export function getTypeOrmConfig(): DataSourceOptions {
	const pgConfig = getConfig();

	return {
		type: 'postgres',
		host: pgConfig.host,
		port: pgConfig.port,
		username: pgConfig.user,
		password: pgConfig.password,
		database: pgConfig.database,
		entities,
		migrations: ['src/migrations/*.ts'],
		synchronize: false,
		logging: process.env.NODE_ENV === 'development',
		namingStrategy: new SnakeNamingStrategy(),
	};
}

export function getTypeOrmModuleConfig(): DataSourceOptions {
	const pgConfig = getConfig();

	return {
		type: 'postgres',
		host: pgConfig.host,
		port: pgConfig.port,
		username: pgConfig.user,
		password: pgConfig.password,
		database: pgConfig.database,
		entities,
		migrations: ['dist/migrations/*.js'],
		synchronize: false,
		logging: process.env.NODE_ENV === 'development',
		namingStrategy: new SnakeNamingStrategy(),
	};
}

// DataSource for CLI usage (migrations)
const dataSource = new DataSource(getTypeOrmConfig());

export default dataSource;
