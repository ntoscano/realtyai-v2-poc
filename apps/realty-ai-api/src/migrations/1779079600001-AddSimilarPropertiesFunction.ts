import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSimilarPropertiesFunction1779079600001
	implements MigrationInterface
{
	name = 'AddSimilarPropertiesFunction1779079600001';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// PostgreSQL function for similarity search
		// PostGraphile auto-exposes this as similarProperties(propertyId, resultLimit)
		await queryRunner.query(`
            CREATE OR REPLACE FUNCTION similar_properties(
                property_id UUID,
                result_limit INT DEFAULT 5
            )
            RETURNS TABLE (
                id UUID,
                type VARCHAR(255),
                name VARCHAR(255),
                slug VARCHAR(255),
                payload JSONB,
                meta JSONB,
                created_at TIMESTAMP,
                updated_at TIMESTAMP,
                similarity FLOAT
            ) AS $$
            DECLARE
                source_embedding vector(1024);
            BEGIN
                -- Get embedding of source property
                SELECT p.embedding INTO source_embedding
                FROM property p WHERE p.id = property_id;

                -- Return empty if no embedding
                IF source_embedding IS NULL THEN RETURN; END IF;

                -- Return similar properties ordered by cosine similarity
                RETURN QUERY
                SELECT
                    p.id, p.type, p.name, p.slug, p.payload, p.meta,
                    p.created_at, p.updated_at,
                    (1 - (p.embedding <=> source_embedding))::FLOAT AS similarity
                FROM property p
                WHERE p.id != property_id AND p.embedding IS NOT NULL
                ORDER BY p.embedding <=> source_embedding
                LIMIT result_limit;
            END;
            $$ LANGUAGE plpgsql STABLE;
        `);

		await queryRunner.query(`
            COMMENT ON FUNCTION similar_properties(UUID, INT) IS
            'Find properties similar to the given property using vector similarity search';
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(
			`DROP FUNCTION IF EXISTS similar_properties(UUID, INT);`,
		);
	}
}
