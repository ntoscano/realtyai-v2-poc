// DATA SOURCE: MOCK
// Finds clients/properties by ID in static mock data arrays.
import { mockClients } from '@/data/mockClients';
import { mockProperties } from '@/data/mockProperties';
import type { Client } from '@/types/client';
import type { Property } from '@/types/property';

export async function findClientById(id: string): Promise<Client | null> {
	return mockClients.find((c) => c.id === id) || null;
}

export async function findPropertyById(id: string): Promise<Property | null> {
	return mockProperties.find((p) => p.id === id) || null;
}
