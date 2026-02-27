import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateGame1772154510409 implements MigrationInterface {
    name = 'CreateGame1772154510409'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "game" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "board_state" jsonb NOT NULL DEFAULT '[null,null,null,null,null,null,null,null,null]', "status" character varying(20) NOT NULL DEFAULT 'in_progress', "winner" character varying(1), "moves" jsonb NOT NULL DEFAULT '[]', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_352a30652cd352f552fef73dec5" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "game"`);
    }

}
