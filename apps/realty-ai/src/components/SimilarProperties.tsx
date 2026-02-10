'use client';

import { useSimilarProperties } from '@/lib/graphql/hooks';
import { SimilarPropertyCard } from './SimilarPropertyCard';
import { Skeleton } from './ui/skeleton';

type SimilarPropertiesProps = {
	selectedPropertyId: string | undefined;
	onSelectProperty: (id: string) => void;
};

export function SimilarProperties({
	selectedPropertyId,
	onSelectProperty,
}: SimilarPropertiesProps) {
	const { similarProperties, loading, error } = useSimilarProperties(
		selectedPropertyId,
		5,
	);

	if (!selectedPropertyId) return null;

	if (loading) {
		return (
			<div className="space-y-3">
				<h3 className="text-lg font-semibold">Similar Properties</h3>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-32" />
					))}
				</div>
			</div>
		);
	}

	if (error || similarProperties.length === 0) return null;

	return (
		<div className="space-y-3">
			<h3 className="text-lg font-semibold">Similar Properties</h3>
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{similarProperties.map((property) => (
					<SimilarPropertyCard
						key={property.id}
						property={property}
						onClick={() => onSelectProperty(property.id)}
					/>
				))}
			</div>
		</div>
	);
}
