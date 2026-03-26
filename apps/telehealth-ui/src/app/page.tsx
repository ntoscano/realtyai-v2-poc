import Link from 'next/link';
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

export default function Home() {
	return (
		<div className="flex flex-col items-center gap-8">
			<h1 className="text-3xl font-bold">Midi Health</h1>
			<p className="text-muted-foreground">
				Personalized clinician matching and appointment scheduling for menopause
				care.
			</p>
			<div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
				<Link href="/questionnaire">
					<Card className="hover:border-primary/50 transition-colors cursor-pointer">
						<CardHeader>
							<CardTitle>Patient Portal</CardTitle>
							<CardDescription>
								Fill out a health questionnaire and get matched with the right
								clinician.
							</CardDescription>
						</CardHeader>
					</Card>
				</Link>
				<Link href="/clinician">
					<Card className="hover:border-primary/50 transition-colors cursor-pointer">
						<CardHeader>
							<CardTitle>Clinician Dashboard</CardTitle>
							<CardDescription>
								View upcoming appointments and manage your schedule.
							</CardDescription>
						</CardHeader>
					</Card>
				</Link>
			</div>
		</div>
	);
}
