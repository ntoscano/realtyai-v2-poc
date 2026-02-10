'use client';

import { cn } from '@/lib/utils';
import type { SimilarProperty } from '@/types/similarProperty';
import { Badge } from './ui/badge';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from './ui/card';

type SimilarPropertyCardProps = {
	property: SimilarProperty;
	onClick: () => void;
};

function formatPrice(price: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0,
	}).format(price);
}

export function SimilarPropertyCard({
	property,
	onClick,
}: SimilarPropertyCardProps) {
	const matchPercent = Math.round(property.similarity * 100);

	return (
		<Card
			className={cn('cursor-pointer transition-all hover:shadow-md')}
			onClick={onClick}
		>
			<CardHeader className="pb-2">
				<div className="flex justify-between items-start gap-2">
					<CardTitle className="text-sm font-medium leading-tight">
						{property.address}
					</CardTitle>
					<Badge variant="secondary" className="text-xs shrink-0">
						{matchPercent}% match
					</Badge>
				</div>
				<CardDescription className="text-xs">
					{property.city}, {property.state}
				</CardDescription>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="font-semibold text-primary">
					{formatPrice(property.price)}
				</div>
				<div className="text-xs text-muted-foreground">
					{property.beds} beds &bull; {property.baths} baths &bull;{' '}
					{property.sqft.toLocaleString()} sqft
				</div>
			</CardContent>
		</Card>
	);
}
