'use client';

import { cn } from '@/lib/utils';
import { type Client } from '@/types/client';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from './ui/card';

type ClientCardProps = {
	client: Client;
	isSelected?: boolean;
	onClick?: () => void;
};

const buyingStageLabels: Record<Client['buying_stage'], string> = {
	browsing: 'Browsing',
	active: 'Active',
	ready_to_offer: 'Ready to Offer',
};

const buyingStageColors: Record<Client['buying_stage'], string> = {
	browsing: 'bg-zinc-100 text-zinc-700',
	active: 'bg-blue-100 text-blue-700',
	ready_to_offer: 'bg-green-100 text-green-700',
};

const communicationStyleLabels: Record<Client['communication_style'], string> =
	{
		formal: 'Formal',
		casual: 'Casual',
		enthusiastic: 'Enthusiastic',
	};

export function ClientCard({ client, isSelected, onClick }: ClientCardProps) {
	return (
		<Card
			className={cn(
				'cursor-pointer transition-all hover:shadow-md',
				isSelected && 'ring-2 ring-primary ring-offset-2',
			)}
			onClick={onClick}
		>
			<CardHeader className="pb-2">
				<CardTitle className="text-base">{client.name}</CardTitle>
				<CardDescription>{client.email}</CardDescription>
			</CardHeader>
			<CardContent className="flex items-center gap-2">
				<span
					className={cn(
						'rounded-full px-2.5 py-0.5 text-xs font-medium',
						buyingStageColors[client.buying_stage],
					)}
				>
					{buyingStageLabels[client.buying_stage]}
				</span>
				<span className="text-xs text-muted-foreground">
					{communicationStyleLabels[client.communication_style]}
				</span>
			</CardContent>
		</Card>
	);
}
