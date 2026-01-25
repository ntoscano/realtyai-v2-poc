'use client';

import type { Client } from '@/types/client';
import { ClientCard } from './ClientCard';
import { ScrollArea } from './ui/scroll-area';

type ClientSelectorProps = {
	clients: Client[];
	selectedClientId?: string;
	onSelectClient: (clientId: string) => void;
	loading?: boolean;
};

export function ClientSelector({
	clients,
	selectedClientId,
	onSelectClient,
	loading = false,
}: ClientSelectorProps) {
	if (loading) {
		return (
			<div className="h-[500px] rounded-md border p-4 flex items-center justify-center">
				<p className="text-muted-foreground">Loading clients...</p>
			</div>
		);
	}

	return (
		<ScrollArea className="h-[500px] rounded-md border p-4">
			<div className="flex flex-col gap-3">
				{clients.map((client) => (
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
