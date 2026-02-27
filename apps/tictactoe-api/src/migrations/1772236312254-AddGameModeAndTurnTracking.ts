import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGameModeAndTurnTracking1772236312254 implements MigrationInterface {
    name = 'AddGameModeAndTurnTracking1772236312254'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Truncate existing game data (fresh start for dev environment)
        await queryRunner.query(`TRUNCATE TABLE "game"`);

        // Add new columns for game mode and turn tracking
        await queryRunner.query(`ALTER TABLE "game" ADD "mode" character varying(10) NOT NULL DEFAULT 'ai'`);
        await queryRunner.query(`ALTER TABLE "game" ADD "current_turn" character varying(1) NOT NULL DEFAULT 'X'`);
        await queryRunner.query(`ALTER TABLE "game" ADD "player_x_token" uuid`);
        await queryRunner.query(`ALTER TABLE "game" ADD "player_o_token" uuid`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "player_o_token"`);
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "player_x_token"`);
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "current_turn"`);
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "mode"`);
    }

}
