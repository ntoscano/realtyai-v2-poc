import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostGraphileModule } from 'postgraphile-nest';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { postgraphileConfigFactory } from './config/graphile';
import { getTypeOrmModuleConfig } from './config/typeorm';
import { EmbeddingModule } from './modules/embedding/embedding.module';

@Module({
	imports: [
		TypeOrmModule.forRoot(getTypeOrmModuleConfig()),
		PostGraphileModule.forRootAsync({
			imports: [],
			inject: [],
			useFactory: postgraphileConfigFactory,
		}),
		EmbeddingModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
