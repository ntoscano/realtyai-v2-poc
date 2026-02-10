import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPropertyEmbedding1779079600000 implements MigrationInterface {
	name = 'AddPropertyEmbedding1779079600000';

	public async up(queryRunner: QueryRunner): Promise<void> {
		// Enable pgvector extension first
		await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

		// Add embedding column with vector type (1024 dimensions for Amazon Titan Embed Text V2)
		await queryRunner.query(
			`ALTER TABLE "property" ADD "embedding" vector(1024)`,
		);

		// Create HNSW index for fast similarity search
		await queryRunner.query(`
            CREATE INDEX property_embedding_idx
            ON property USING hnsw (embedding vector_cosine_ops);
        `);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX IF EXISTS property_embedding_idx;`);
		await queryRunner.query(
			`ALTER TABLE "property" DROP COLUMN "embedding"`,
		);
		// Note: Don't drop extension in down() as other tables may use it
	}
}
