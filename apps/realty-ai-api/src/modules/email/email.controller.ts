import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
} from '@nestjs/common';
import { EmailService } from './email.service';
import type { GeneratedEmail } from './types/email.types';

class GenerateEmailDto {
	clientId: string;
	propertyId: string;
	notes?: string;
}

@Controller('api')
export class EmailController {
	constructor(private readonly emailService: EmailService) {}

	@Post('generate-email')
	@HttpCode(HttpStatus.OK)
	async generateEmail(@Body() dto: GenerateEmailDto): Promise<GeneratedEmail> {
		return this.emailService.generateEmail(
			dto.clientId,
			dto.propertyId,
			dto.notes,
		);
	}
}
