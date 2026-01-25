'use client';

import { mockProperties } from '@/data/mockProperties';
import { PropertyCard } from './PropertyCard';
import { ScrollArea } from './ui/scroll-area';

type PropertySelectorProps = {
	selectedPropertyId?: string;
	onSelectProperty: (propertyId: string) => void;
};

export function PropertySelector({
	selectedPropertyId,
	onSelectProperty,
}: PropertySelectorProps) {
	return (
		<ScrollArea className="h-[500px] rounded-md border p-4">
			<div className="flex flex-col gap-3">
				{mockProperties.map((property) => (
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
