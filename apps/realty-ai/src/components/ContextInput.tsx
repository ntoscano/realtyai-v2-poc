'use client';

import { Textarea } from './ui/textarea';

type ContextInputProps = {
	value: string;
	onChange: (value: string) => void;
};

export function ContextInput({ value, onChange }: ContextInputProps) {
	return (
		<div className="space-y-2">
			<Textarea
				placeholder="Enter any additional context..."
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="min-h-[100px] resize-none"
			/>
			<p className="text-sm text-muted-foreground">
				This helps tailor the message to your specific needs
			</p>
		</div>
	);
}
