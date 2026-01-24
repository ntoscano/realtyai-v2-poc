import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'RealtyAI',
	description: 'AI-powered real estate outreach tool',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body>{children}</body>
		</html>
	);
}
