import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
	title: 'Midi Health',
	description:
		'Clinician matching and appointment scheduling for menopause care',
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className="min-h-screen bg-background font-sans antialiased">
				<nav className="border-b">
					<div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
						<Link href="/" className="font-bold">
							Midi Health
						</Link>
						<Link
							href="/questionnaire"
							className="text-sm text-muted-foreground hover:text-foreground"
						>
							Patient Portal
						</Link>
						<Link
							href="/clinician"
							className="text-sm text-muted-foreground hover:text-foreground"
						>
							Clinician Dashboard
						</Link>
					</div>
				</nav>
				<main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
			</body>
		</html>
	);
}
