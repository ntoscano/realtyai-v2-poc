import { getConfig } from './postgres';

/**
 * PostGraphile configuration factory for NestJS integration.
 * Uses a read-only postgraphile_user role to prevent mutations via GraphQL.
 */
export const postgraphileConfigFactory = () => {
	const pgConfig = getConfig();

	return {
		pgConfig: {
			host: pgConfig.host,
			port: pgConfig.port,
			user: process.env.POSTGRAPHILE_USER || 'postgraphile_user',
			password:
				process.env.POSTGRAPHILE_PASSWORD || 'postgraphile',
			database: pgConfig.database,
		},
		graphiql: process.env.GRAPHIQL_ENABLED === 'true',
		dynamicJson: true,
		enableCors: true,
		watchPg: process.env.NODE_ENV === 'development',
		showErrorStack: process.env.NODE_ENV === 'development',
		extendedErrors:
			process.env.NODE_ENV === 'development'
				? ['hint', 'detail', 'errcode']
				: [],
	};
};
