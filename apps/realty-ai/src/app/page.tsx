'use client';

import { ClientSelector } from '@/components/ClientSelector';
import { ContextInput } from '@/components/ContextInput';
import { EmailPreview } from '@/components/EmailPreview';
import { PropertySelector } from '@/components/PropertySelector';
import { SimilarProperties } from '@/components/SimilarProperties';
import { Button } from '@/components/ui/button';
// DATA SOURCE: Currently using MOCK data.
// To switch to live backend, change to: import { useLiveData as useData } from '@/lib/data/useLiveData';
import { useLiveData as useData } from '@/lib/data/useLiveData';
import { generatePlaceholderEmail } from '@/lib/generatePlaceholderEmail';
import { type GeneratedEmail } from '@/types/email';
import { useState } from 'react';

export default function Home() {
	const { clients, properties, loading, dataSource } = useData();

	const [selectedClientId, setSelectedClientId] = useState<string | undefined>(
		undefined,
	);
	const [selectedPropertyId, setSelectedPropertyId] = useState<
		string | undefined
	>(undefined);
	const [contextNotes, setContextNotes] = useState('');
	const [generatedEmail, setGeneratedEmail] = useState<GeneratedEmail | null>(
		null,
	);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const canGenerate = selectedClientId && selectedPropertyId && !isLoading;

	const handleGenerate = async () => {
		if (!selectedClientId || !selectedPropertyId) return;

		setIsLoading(true);
		setError(null);

		try {
			const response = await fetch('/api/generate-email', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					clientId: selectedClientId,
					propertyId: selectedPropertyId,
					notes: contextNotes || undefined,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || `API error: ${response.status}`);
			}

			const data = await response.json();
			setGeneratedEmail(data);
		} catch (err) {
			console.error('Failed to generate email via API:', err);
			setError(err instanceof Error ? err.message : 'Failed to generate email');

			// Fallback to placeholder generation using current data source
			const client = clients.find((c) => c.id === selectedClientId);
			const property = properties.find((p) => p.id === selectedPropertyId);

			if (client && property) {
				const fallbackEmail = generatePlaceholderEmail(
					client,
					property,
					contextNotes || undefined,
				);
				setGeneratedEmail(fallbackEmail);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const dataSourceMessage =
		dataSource === 'live' ? 'Connected to live API' : 'Using mock data';

	return (
		<main className="container mx-auto max-w-7xl px-4 py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">RealtyAI</h1>
				<p className="text-muted-foreground">
					AI-powered real estate outreach tool
				</p>
				<p className="text-xs text-muted-foreground mt-1">
					{dataSourceMessage}
				</p>
			</div>

			<div className="space-y-8">
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div className="space-y-2">
						<h2 className="text-lg font-semibold">Select Client</h2>
						<ClientSelector
							clients={clients}
							selectedClientId={selectedClientId}
							onSelectClient={setSelectedClientId}
							loading={loading}
						/>
					</div>
					<div className="space-y-2">
						<h2 className="text-lg font-semibold">Select Property</h2>
						<PropertySelector
							properties={properties}
							selectedPropertyId={selectedPropertyId}
							onSelectProperty={setSelectedPropertyId}
							loading={loading}
						/>
					</div>
				</div>

				{/* Similar Properties Section */}
				<SimilarProperties
					selectedPropertyId={selectedPropertyId}
					onSelectProperty={setSelectedPropertyId}
				/>

				<div className="space-y-2">
					<h2 className="text-lg font-semibold">Additional Context</h2>
					<ContextInput value={contextNotes} onChange={setContextNotes} />
				</div>

				<div className="flex flex-col items-center gap-2">
					<Button
						size="lg"
						disabled={!canGenerate}
						onClick={handleGenerate}
						className="px-8"
					>
						{isLoading ? 'Generating...' : 'Generate Email'}
					</Button>
					{error && (
						<p className="text-sm text-destructive">
							{error} (Using placeholder email instead)
						</p>
					)}
				</div>

				<EmailPreview email={generatedEmail} />
			</div>
		</main>
	);
}
