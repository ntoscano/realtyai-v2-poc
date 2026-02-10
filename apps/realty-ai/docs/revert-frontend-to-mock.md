# Plan: Separate Mock and GraphQL Data Flows

## Problem

Data fetching interleaves mock and GraphQL in the same functions, making it impossible to test either independently. Two files have this coupling:

1. **`src/app/page.tsx`** — Calls GraphQL hooks AND imports mock arrays, uses ternary fallback
2. **`src/app/api/generate-email/route.ts`** — `lookupClient()`/`lookupProperty()` try mock first, then GraphQL

## Approach

Create two clearly named hooks (`useMockData`, `useLiveData`) and two lookup modules (`lookup.mock.ts`, `lookup.live.ts`). The page and API route import the mock version now. Switching to live later = change one import.

**No existing code is deleted.** `src/lib/graphql/` stays untouched.

## Files to Create (4 new files)

### 1. `src/lib/data/useMockData.ts` — Frontend hook for mock data

```typescript
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
```

### 2. `src/lib/data/useLiveData.ts` — Frontend hook for GraphQL backend

```typescript
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
```

### 3. `src/lib/data/lookup.mock.ts` — Server-side lookup from mock arrays

```typescript
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
```

### 4. `src/lib/data/lookup.live.ts` — Server-side lookup from GraphQL

Move the existing `isUUID()`, `lookupClient()`, and `lookupProperty()` logic from `route.ts` into this file, renamed to `findClientById` / `findPropertyById`.

```typescript
// DATA SOURCE: LIVE (GraphQL backend)
// Looks up clients/properties via Apollo Client from the backend DB.
import { apolloClient } from '@/lib/graphql/client';
import { transformClient, transformProperty } from '@/lib/graphql/hooks';
import type {
	GraphQLClientNode,
	GraphQLPropertyNode,
} from '@/lib/graphql/hooks';
import { GET_CLIENT_BY_ID, GET_PROPERTY_BY_ID } from '@/lib/graphql/queries';
import type { Client } from '@/types/client';
import type { Property } from '@/types/property';

function isUUID(id: string): boolean {
	/* moved from route.ts */
}

export async function findClientById(id: string): Promise<Client | null> {
	// GraphQL query by UUID (existing lookupClient logic, without mock fallback)
}

export async function findPropertyById(id: string): Promise<Property | null> {
	// GraphQL query by UUID (existing lookupProperty logic, without mock fallback)
}
```

## Files to Modify (2 files)

### 5. `src/app/page.tsx`

**Remove:**

- `import { mockClients } from '@/data/mockClients'`
- `import { mockProperties } from '@/data/mockProperties'`
- `import { useClients, useProperties } from '@/lib/graphql/hooks'`
- GraphQL hook calls and ternary fallback logic (lines 17-31)
- The `usingGraphQL` / `dataSourceMessage` computation (lines 96-105)

**Add:**

```typescript
// DATA SOURCE: Currently using MOCK data.
// To switch to live backend, change to: import { useLiveData as useData } from '@/lib/data/useLiveData';
import { useMockData as useData } from '@/lib/data/useMockData';
```

Then in the component:

```typescript
const { clients, properties, loading, error, dataSource } = useData();
```

And for the status indicator:

```typescript
const dataSourceMessage =
	dataSource === 'mock' ? 'Using mock data' : 'Connected to live API';
```

### 6. `src/app/api/generate-email/route.ts`

**Remove:**

- `import { mockClients }` and `import { mockProperties }`
- `import { apolloClient }` and all GraphQL imports
- `isUUID()` function
- `lookupProperty()` function
- `lookupClient()` function
- `PropertyByIdResponse` and `ClientByIdResponse` types

**Add:**

```typescript
// DATA SOURCE: Currently using MOCK lookups.
// To switch to live backend, change to: import { findClientById, findPropertyById } from '@/lib/data/lookup.live';
import { findClientById, findPropertyById } from '@/lib/data/lookup.mock';
```

Then in the POST handler, replace `lookupClient(clientId)` with `findClientById(clientId)` and `lookupProperty(propertyId)` with `findPropertyById(propertyId)`.

## What Stays Untouched

- `src/lib/graphql/` — All 3 files (client.ts, queries.ts, hooks.ts) unchanged
- `src/data/` — Mock data files unchanged
- `src/components/` — All components unchanged (props-based)
- `src/lib/ai/` — LangGraph pipeline unchanged
- `src/types/` — Type definitions unchanged

## Result

```
src/lib/data/
├── useMockData.ts     ← Hook: returns static mock arrays (no network)
├── useLiveData.ts     ← Hook: calls useProperties/useClients from GraphQL
├── lookup.mock.ts     ← Server: finds by ID in mock arrays
└── lookup.live.ts     ← Server: queries Apollo Client by UUID
```

**To switch to live backend later:** Change 2 import lines:

- `page.tsx`: `useMockData` → `useLiveData`
- `route.ts`: `lookup.mock` → `lookup.live`

## Verification

1. `pnpm dev` in `apps/realty-ai` — loads with mock data, no GraphQL errors in console
2. Select client + property → Generate Email → works with mock data
3. No network calls to `localhost:3001/graphql` in browser devtools
4. `pnpm typecheck` passes — GraphQL files still compile, just not imported by active code
