import Link from 'next/link';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
	return (
		<div className="flex flex-col items-center gap-8">
			<h1 className="text-3xl font-bold">Shift Marketplace</h1>
			<p className="text-muted-foreground">
				Healthcare shift marketplace — facilities post shifts, professionals
				book them.
			</p>
			<div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
				<Link href="/facility">
					<Card className="hover:border-primary/50 transition-colors cursor-pointer">
						<CardHeader>
							<CardTitle>Facility Dashboard</CardTitle>
							<CardDescription>
								Post shifts and manage your facility&apos;s schedule.
							</CardDescription>
						</CardHeader>
					</Card>
				</Link>
				<Link href="/professional">
					<Card className="hover:border-primary/50 transition-colors cursor-pointer">
						<CardHeader>
							<CardTitle>Professional Dashboard</CardTitle>
							<CardDescription>
								Browse available shifts and manage your bookings.
							</CardDescription>
						</CardHeader>
					</Card>
				</Link>
			</div>
		</div>
	);
}
