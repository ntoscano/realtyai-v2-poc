import { gql } from '@apollo/client';

export const GET_ALL_GAMES = gql`
	query GetAllGames {
		allGames(orderBy: CREATED_AT_DESC) {
			nodes {
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

export const GET_GAME_BY_ID = gql`
	query GetGameById($id: UUID!) {
		gameById(id: $id) {
			id
			boardState
			status
			winner
			moves
			createdAt
		}
	}
`;
