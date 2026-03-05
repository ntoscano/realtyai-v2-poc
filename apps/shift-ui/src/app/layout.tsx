import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
	title: 'Shift Marketplace',
	description: 'Healthcare shift marketplace for facilities and professionals',
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
							Shift Marketplace
						</Link>
						<Link
							href="/facility"
							className="text-sm text-muted-foreground hover:text-foreground"
						>
							Facility Dashboard
						</Link>
						<Link
							href="/professional"
							className="text-sm text-muted-foreground hover:text-foreground"
						>
							Professional Dashboard
						</Link>
					</div>
				</nav>
				<main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
			</body>
		</html>
	);
}
