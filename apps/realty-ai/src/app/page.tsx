'use client';

import { ClientSelector } from '@/components/ClientSelector';
import { ContextInput } from '@/components/ContextInput';
import { EmailPreview } from '@/components/EmailPreview';
import { PropertySelector } from '@/components/PropertySelector';
import { Button } from '@/components/ui/button';
import { mockClients } from '@/data/mockClients';
import { mockProperties } from '@/data/mockProperties';
import { generatePlaceholderEmail } from '@/lib/generatePlaceholderEmail';
import { type GeneratedEmail } from '@/types/email';
import { useState } from 'react';

export default function Home() {
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

	const canGenerate = selectedClientId && selectedPropertyId;

	const handleGenerate = () => {
		if (!selectedClientId || !selectedPropertyId) return;

		const client = mockClients.find((c) => c.id === selectedClientId);
		const property = mockProperties.find((p) => p.id === selectedPropertyId);

		if (!client || !property) return;

		const email = generatePlaceholderEmail(
			client,
			property,
			contextNotes || undefined,
		);
		setGeneratedEmail(email);
	};

	return (
		<main className="container mx-auto max-w-7xl px-4 py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">RealtyAI</h1>
				<p className="text-muted-foreground">
					AI-powered real estate outreach tool
				</p>
			</div>

			<div className="space-y-8">
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div className="space-y-2">
						<h2 className="text-lg font-semibold">Select Client</h2>
						<ClientSelector
							selectedClientId={selectedClientId}
							onSelectClient={setSelectedClientId}
						/>
					</div>
					<div className="space-y-2">
						<h2 className="text-lg font-semibold">Select Property</h2>
						<PropertySelector
							selectedPropertyId={selectedPropertyId}
							onSelectProperty={setSelectedPropertyId}
						/>
					</div>
				</div>

				<div className="space-y-2">
					<h2 className="text-lg font-semibold">Additional Context</h2>
					<ContextInput value={contextNotes} onChange={setContextNotes} />
				</div>

				<div className="flex justify-center">
					<Button
						size="lg"
						disabled={!canGenerate}
						onClick={handleGenerate}
						className="px-8"
					>
						Generate Email
					</Button>
				</div>

				<EmailPreview email={generatedEmail} />
			</div>
		</main>
	);
}
