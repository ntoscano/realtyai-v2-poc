export const metadata = {
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
			<body>{children}</body>
		</html>
	);
}
