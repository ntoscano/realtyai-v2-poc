'use client';

import { type GeneratedEmail } from '@/types/email';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from './ui/card';

type EmailPreviewProps = {
	email?: GeneratedEmail | null;
};

export function EmailPreview({ email }: EmailPreviewProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		if (!email) return;

		const text = `Subject: ${email.subject}\n\n${email.body}`;
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (!email) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Email Preview</CardTitle>
					<CardDescription>
						Select a client and property, then generate an email to preview it
						here.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex h-40 items-center justify-center rounded-md border border-dashed text-muted-foreground">
						No email generated yet
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-start justify-between space-y-0">
				<div className="space-y-1.5">
					<CardTitle>Email Preview</CardTitle>
					<CardDescription>
						Review the generated email before sending
					</CardDescription>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleCopy}
					className="shrink-0"
				>
					{copied ? (
						<>
							<Check className="mr-2 h-4 w-4" />
							Copied
						</>
					) : (
						<>
							<Copy className="mr-2 h-4 w-4" />
							Copy to Clipboard
						</>
					)}
				</Button>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-1">
					<p className="text-sm font-medium text-muted-foreground">Subject</p>
					<p className="text-lg font-semibold">{email.subject}</p>
				</div>
				<div className="space-y-2">
					<p className="text-sm font-medium text-muted-foreground">Body</p>
					<div className="whitespace-pre-wrap rounded-md bg-muted/50 p-4 text-sm leading-relaxed">
						{email.body}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
