import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
	title: 'AI Tic-Tac-Toe',
	description: 'Play Tic-Tac-Toe against an AI opponent',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className="min-h-screen bg-background font-sans antialiased">
				{children}
			</body>
		</html>
	);
}
