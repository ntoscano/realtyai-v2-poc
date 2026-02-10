// DATA SOURCE: MOCK
// Returns static mock data arrays. No network calls.
import { mockClients } from '@/data/mockClients';
import { mockProperties } from '@/data/mockProperties';

export function useMockData() {
	return {
		clients: mockClients,
		properties: mockProperties,
		loading: false,
		error: null,
		dataSource: 'mock' as const,
	};
}
