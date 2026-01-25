'use client';

import type { Property } from '@/types/property';
import { PropertyCard } from './PropertyCard';
import { ScrollArea } from './ui/scroll-area';

type PropertySelectorProps = {
	properties: Property[];
	selectedPropertyId?: string;
	onSelectProperty: (propertyId: string) => void;
	loading?: boolean;
};

export function PropertySelector({
	properties,
	selectedPropertyId,
	onSelectProperty,
	loading = false,
}: PropertySelectorProps) {
	if (loading) {
		return (
			<div className="h-[500px] rounded-md border p-4 flex items-center justify-center">
				<p className="text-muted-foreground">Loading properties...</p>
			</div>
		);
	}

	return (
		<ScrollArea className="h-[500px] rounded-md border p-4">
			<div className="flex flex-col gap-3">
				{properties.map((property) => (
					<PropertyCard
						key={property.id}
						property={property}
						isSelected={property.id === selectedPropertyId}
						onClick={() => onSelectProperty(property.id)}
					/>
				))}
			</div>
		</ScrollArea>
	);
}
