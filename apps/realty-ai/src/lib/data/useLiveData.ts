// DATA SOURCE: LIVE (GraphQL backend)
// Fetches clients and properties from the backend API via Apollo Client.
import { useClients, useProperties } from '@/lib/graphql/hooks';

export function useLiveData() {
	const { properties, loading: pLoading, error: pError } = useProperties();
	const { clients, loading: cLoading, error: cError } = useClients();

	return {
		clients,
		properties,
		loading: pLoading || cLoading,
		error: pError || cError,
		dataSource: 'live' as const,
	};
}
