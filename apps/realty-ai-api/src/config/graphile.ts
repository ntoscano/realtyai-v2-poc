import { getConfig } from './postgres';

/**
 * PostGraphile configuration factory for NestJS integration.
 * Returns configuration options for the PostGraphile module.
 */
export const postgraphileConfigFactory = () => {
	const pgConfig = getConfig();

	return {
		pgConfig: {
			host: pgConfig.host,
			port: pgConfig.port,
			user: pgConfig.user,
			password: pgConfig.password,
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
