module.exports = class RealtyAIProvider {
	id() {
		return 'realty-ai-email';
	}

	async callApi(prompt, context) {
		const { vars } = context;

		const response = await fetch('http://localhost:3001/api/generate-email', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				propertyId: vars.propertyId,
				clientId: vars.clientId,
				notes: vars.agentNotes || '',
			}),
		});

		if (!response.ok) {
			const text = await response.text();
			return { error: `API error: ${response.status} - ${text}` };
		}

		const data = await response.json();
		// Combine subject and body for evaluation
		return { output: `Subject: ${data.subject}\n\n${data.body}` };
	}
};
