import { gql } from '@apollo/client';

export const CREATE_GAME = gql`
	mutation CreateGame($input: CreateGameInput!) {
		createGame(input: $input) {
			game {
				id
				boardState
				status
				winner
				moves
				createdAt
			}
		}
	}
`;

export const UPDATE_GAME = gql`
	mutation UpdateGameById($input: UpdateGameByIdInput!) {
		updateGameById(input: $input) {
			game {
				id
				boardState
				status
				winner
				moves
				createdAt
			}
		}
	}
`;
