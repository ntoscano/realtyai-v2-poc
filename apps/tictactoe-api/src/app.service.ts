import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
	getRoot(): { message: string } {
		return { message: 'TicTacToe API' };
	}

	getHealth(): { status: string } {
		return { status: 'ok' };
	}
}
