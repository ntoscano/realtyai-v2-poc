export type BuyingStage = 'browsing' | 'active' | 'ready_to_offer';

export type CommunicationStyle = 'formal' | 'casual' | 'enthusiastic';

export type Client = {
	id: string;
	name: string;
	email: string;
	buying_stage: BuyingStage;
	preferences: string[];
	budget_range: string;
	lifestyle_notes: string;
	communication_style: CommunicationStyle;
};
