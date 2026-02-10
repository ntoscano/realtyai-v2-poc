import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1769314817078 implements MigrationInterface {
    name = 'InitialSchema1769314817078'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Note: uuid-ossp extension must be created by superuser before running this migration
        // Run: docker exec pg psql -U postgres -d realty-ai -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
        await queryRunner.query(`CREATE TABLE "property" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "slug" character varying(255), "payload" jsonb NOT NULL DEFAULT '{}', "meta" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d80743e6191258a5003d5843b4f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "client" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "type" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "slug" character varying(255), "payload" jsonb NOT NULL DEFAULT '{}', "meta" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_96da49381769303a6515a8785c7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6436cc6b79593760b9ef921ef1" ON "client" ("email") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_6436cc6b79593760b9ef921ef1"`);
        await queryRunner.query(`DROP TABLE "client"`);
        await queryRunner.query(`DROP TABLE "property"`);
    }

}
