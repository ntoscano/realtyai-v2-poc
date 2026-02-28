import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePostgraphileReadOnlyRole1772320000000 implements MigrationInterface {
    name = 'CreatePostgraphileReadOnlyRole1772320000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create postgraphile_user role with LOGIN privilege
        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'postgraphile_user') THEN
                    CREATE ROLE postgraphile_user WITH LOGIN PASSWORD 'postgraphile';
                END IF;
            END
            $$;
        `);

        // Grant connect on the database
        await queryRunner.query(`GRANT CONNECT ON DATABASE tictactoe TO postgraphile_user`);

        // Grant usage on public schema
        await queryRunner.query(`GRANT USAGE ON SCHEMA public TO postgraphile_user`);

        // Grant SELECT only on the game table
        await queryRunner.query(`GRANT SELECT ON game TO postgraphile_user`);

        // Explicitly revoke write operations (defense in depth)
        await queryRunner.query(`REVOKE INSERT, UPDATE, DELETE ON game FROM postgraphile_user`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`REVOKE ALL PRIVILEGES ON game FROM postgraphile_user`);
        await queryRunner.query(`REVOKE USAGE ON SCHEMA public FROM postgraphile_user`);
        await queryRunner.query(`REVOKE CONNECT ON DATABASE tictactoe FROM postgraphile_user`);
        await queryRunner.query(`DROP ROLE IF EXISTS postgraphile_user`);
    }

}
