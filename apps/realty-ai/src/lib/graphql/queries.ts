import { gql } from '@apollo/client';

/**
 * GraphQL query to fetch all properties
 * PostGraphile uses connection pattern: allProperties { nodes { ... } }
 */
export const GET_ALL_PROPERTIES = gql`
	query GetAllProperties {
		allProperties {
			nodes {
				id
				name
				slug
				payload
			}
		}
	}
`;

/**
 * GraphQL query to fetch all clients
 * PostGraphile uses connection pattern: allClients { nodes { ... } }
 */
export const GET_ALL_CLIENTS = gql`
	query GetAllClients {
		allClients {
			nodes {
				id
				name
				email
				slug
				payload
			}
		}
	}
`;

/**
 * GraphQL query to fetch a single property by ID
 */
export const GET_PROPERTY_BY_ID = gql`
	query GetPropertyById($id: UUID!) {
		propertyById(id: $id) {
			id
			name
			slug
			payload
		}
	}
`;

/**
 * GraphQL query to fetch a single client by ID
 */
export const GET_CLIENT_BY_ID = gql`
	query GetClientById($id: UUID!) {
		clientById(id: $id) {
			id
			name
			email
			slug
			payload
		}
	}
`;

/**
 * GraphQL query to fetch similar properties using vector similarity
 */
export const GET_SIMILAR_PROPERTIES = gql`
	query GetSimilarProperties($propertyId: UUID!, $resultLimit: Int) {
		similarProperties(propertyId: $propertyId, resultLimit: $resultLimit) {
			nodes {
				id
				name
				slug
				payload
				similarity
			}
		}
	}
`;
