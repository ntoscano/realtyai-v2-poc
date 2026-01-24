'use client';

import { mockClients } from '@/data/mockClients';
import { ClientCard } from './ClientCard';
import { ScrollArea } from './ui/scroll-area';

type ClientSelectorProps = {
	selectedClientId?: string;
	onSelectClient: (clientId: string) => void;
};

export function ClientSelector({
	selectedClientId,
	onSelectClient,
}: ClientSelectorProps) {
	return (
		<ScrollArea className="h-[500px] rounded-md border p-4">
			<div className="flex flex-col gap-3">
				{mockClients.map((client) => (
					<ClientCard
						key={client.id}
						client={client}
						isSelected={client.id === selectedClientId}
						onClick={() => onSelectClient(client.id)}
					/>
				))}
			</div>
		</ScrollArea>
	);
}
