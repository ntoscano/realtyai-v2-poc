import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { QuestionnaireService } from './questionnaire.service';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';

@Controller('api/questionnaires')
export class QuestionnaireController {
	constructor(private readonly questionnaireService: QuestionnaireService) {}

	@Post()
	create(@Body() dto: CreateQuestionnaireDto) {
		return this.questionnaireService.create(dto);
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.questionnaireService.findOne(id);
	}
}
