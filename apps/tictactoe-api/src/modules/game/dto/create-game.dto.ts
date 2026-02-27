import { IsIn } from 'class-validator';

export class CreateGameDto {
	@IsIn(['ai', 'pvp'])
	mode: 'ai' | 'pvp';
}
