import type { Property } from './property';

/**
 * Property with similarity score from vector search
 */
export type SimilarProperty = Property & {
	/** Similarity score from 0-1, where 1 is identical */
	similarity: number;
};
