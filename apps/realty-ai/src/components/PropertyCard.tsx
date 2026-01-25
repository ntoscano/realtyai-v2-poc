'use client';

import { cn } from '@/lib/utils';
import { type Property } from '@/types/property';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from './ui/card';

type PropertyCardProps = {
	property: Property;
	isSelected?: boolean;
	onClick?: () => void;
};

const propertyTypeLabels: Record<Property['property_type'], string> = {
	SFH: 'Single Family',
	condo: 'Condo',
	townhouse: 'Townhouse',
};

const propertyTypeColors: Record<Property['property_type'], string> = {
	SFH: 'bg-purple-100 text-purple-700',
	condo: 'bg-amber-100 text-amber-700',
	townhouse: 'bg-teal-100 text-teal-700',
};

function formatPrice(price: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0,
	}).format(price);
}

export function PropertyCard({
	property,
	isSelected,
	onClick,
}: PropertyCardProps) {
	return (
		<Card
			className={cn(
				'cursor-pointer transition-all hover:shadow-md',
				isSelected && 'ring-2 ring-primary ring-offset-2',
			)}
			onClick={onClick}
		>
			<CardHeader className="pb-2">
				<CardTitle className="text-base">{property.address}</CardTitle>
				<CardDescription>
					{property.city}, {property.state}
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				<div className="text-lg font-semibold text-primary">
					{formatPrice(property.price)}
				</div>
				<div className="flex items-center gap-3 text-sm text-muted-foreground">
					<span>{property.beds} beds</span>
					<span>•</span>
					<span>{property.baths} baths</span>
					<span>•</span>
					<span>{property.sqft.toLocaleString()} sqft</span>
				</div>
				<span
					className={cn(
						'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
						propertyTypeColors[property.property_type],
					)}
				>
					{propertyTypeLabels[property.property_type]}
				</span>
			</CardContent>
		</Card>
	);
}
