import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local file
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import { DataSource } from 'typeorm';
import { getTypeOrmConfig } from '../config/typeorm';
import { Property, PropertyPayload } from '../modules/property/property.entity';
import { Client, ClientPayload } from '../modules/client/client.entity';

// Mock properties data from apps/realty-ai/src/data/mockProperties.ts
const mockProperties = [
	{
		id: 'property-001',
		address: '1247 Oak Street',
		city: 'Austin',
		state: 'TX',
		price: 525000,
		beds: 3,
		baths: 2,
		sqft: 1850,
		property_type: 'SFH',
		highlights: [
			'Updated kitchen with quartz countertops',
			'Hardwood floors throughout',
			'Private backyard with mature trees',
			'Recently renovated master bath',
		],
		neighborhood_description:
			'Located in the heart of East Austin, this vibrant neighborhood offers walkable access to local coffee shops, restaurants, and parks. Known for its eclectic mix of historic homes and modern developments.',
	},
	{
		id: 'property-002',
		address: '892 Harbor View Drive',
		city: 'Seattle',
		state: 'WA',
		price: 875000,
		beds: 4,
		baths: 3,
		sqft: 2400,
		property_type: 'SFH',
		highlights: [
			'Panoramic water views from living room',
			'Chef-grade kitchen with Viking appliances',
			'Attached two-car garage',
			'Smart home system installed',
			'Energy-efficient windows',
		],
		neighborhood_description:
			'Quiet residential area in West Seattle with stunning views of Puget Sound. Minutes from the West Seattle Junction with shops, restaurants, and the Alki Beach trail.',
	},
	{
		id: 'property-003',
		address: '456 Peachtree Lane',
		city: 'Atlanta',
		state: 'GA',
		price: 385000,
		beds: 3,
		baths: 2,
		sqft: 1650,
		property_type: 'townhouse',
		highlights: [
			'Open concept living and dining',
			'Two-story floor plan',
			'Private patio area',
			'Community pool access',
		],
		neighborhood_description:
			'Prime Buckhead location near top-rated schools and shopping at Lenox Square. Easy access to MARTA for downtown commutes.',
	},
	{
		id: 'property-004',
		address: '2100 Michigan Avenue, Unit 1804',
		city: 'Chicago',
		state: 'IL',
		price: 649000,
		beds: 2,
		baths: 2,
		sqft: 1350,
		property_type: 'condo',
		highlights: [
			'Floor-to-ceiling windows',
			'Lake Michigan views',
			'In-unit washer and dryer',
			'Building gym and rooftop deck',
			'24-hour doorman',
		],
		neighborhood_description:
			'South Loop luxury high-rise with direct access to the lakefront trail. Walking distance to Museum Campus, Grant Park, and excellent restaurants along Michigan Avenue.',
	},
	{
		id: 'property-005',
		address: '783 Sunset Boulevard',
		city: 'Phoenix',
		state: 'AZ',
		price: 445000,
		beds: 4,
		baths: 2.5,
		sqft: 2100,
		property_type: 'SFH',
		highlights: [
			'Desert landscaping with low water use',
			'Covered patio with mountain views',
			'Three-car garage',
			'Solar panels installed',
		],
		neighborhood_description:
			'Family-friendly Arcadia neighborhood known for excellent schools and outdoor recreation. Close to hiking trails at Camelback Mountain and the trendy shops along the Biltmore corridor.',
	},
	{
		id: 'property-006',
		address: '321 Beacon Street, Unit 5B',
		city: 'Boston',
		state: 'MA',
		price: 1150000,
		beds: 2,
		baths: 2,
		sqft: 1200,
		property_type: 'condo',
		highlights: [
			'Historic brownstone character',
			'Exposed brick walls',
			'Bay windows with natural light',
			'Deeded parking spot',
		],
		neighborhood_description:
			"Classic Back Bay location on one of Boston's most prestigious streets. Steps from the Charles River Esplanade, Newbury Street shopping, and the Boston Public Garden.",
	},
	{
		id: 'property-007',
		address: '1589 Palm Court',
		city: 'Miami',
		state: 'FL',
		price: 720000,
		beds: 3,
		baths: 2,
		sqft: 1800,
		property_type: 'SFH',
		highlights: [
			'Private pool and spa',
			'Impact windows throughout',
			'Modern open floor plan',
			'Updated electrical and plumbing',
			'Covered outdoor kitchen',
		],
		neighborhood_description:
			'Sought-after Coral Gables location with tree-lined streets and Mediterranean architecture. Close to the University of Miami, Miracle Mile dining, and Venetian Pool.',
	},
	{
		id: 'property-008',
		address: '4420 Cherry Blossom Way',
		city: 'Denver',
		state: 'CO',
		price: 595000,
		beds: 3,
		baths: 2.5,
		sqft: 1950,
		property_type: 'townhouse',
		highlights: [
			'Mountain views from rooftop deck',
			'Finished basement with wet bar',
			'Heated garage',
			'Walking distance to light rail',
		],
		neighborhood_description:
			'Modern townhome community in the Highlands neighborhood. Known for its craft breweries, farm-to-table restaurants, and weekend farmers markets along 32nd Avenue.',
	},
	{
		id: 'property-009',
		address: '567 Magnolia Street',
		city: 'Charleston',
		state: 'SC',
		price: 475000,
		beds: 3,
		baths: 2,
		sqft: 1700,
		property_type: 'SFH',
		highlights: [
			'Classic southern porch',
			'Original hardwood floors',
			'Updated systems with historic charm',
			'Detached carriage house',
		],
		neighborhood_description:
			'Historic downtown Charleston near King Street shopping and world-class dining. Walkable to the waterfront, College of Charleston, and Marion Square.',
	},
	{
		id: 'property-010',
		address: '8901 Wilshire Boulevard, Unit 12C',
		city: 'Los Angeles',
		state: 'CA',
		price: 1875000,
		beds: 3,
		baths: 3,
		sqft: 2200,
		property_type: 'condo',
		highlights: [
			'Full-service luxury building',
			'Private balcony with city views',
			'Custom Italian kitchen',
			'Two parking spaces',
			'Resort-style amenities',
		],
		neighborhood_description:
			'Premier Beverly Hills adjacent location on the Miracle Mile. Walking distance to LACMA, The Grove, and countless dining options along Restaurant Row.',
	},
	{
		id: 'property-011',
		address: '234 River Road',
		city: 'Portland',
		state: 'OR',
		price: 485000,
		beds: 2,
		baths: 1.5,
		sqft: 1400,
		property_type: 'townhouse',
		highlights: [
			'Energy Star certified',
			'Bamboo flooring',
			'Private garden patio',
			'Bike storage and workshop',
		],
		neighborhood_description:
			"Pearl District location known for art galleries, independent bookstores, and Portland's best food scene. Direct access to Forest Park trails and the Willamette River waterfront.",
	},
	{
		id: 'property-012',
		address: '1776 Independence Way',
		city: 'Philadelphia',
		state: 'PA',
		price: 365000,
		beds: 3,
		baths: 1.5,
		sqft: 1550,
		property_type: 'townhouse',
		highlights: [
			'Renovated kitchen with granite',
			'Exposed brick accent walls',
			'Basement with full bathroom rough-in',
			'New HVAC system',
		],
		neighborhood_description:
			"Charming Fishtown rowhouse in one of Philadelphia's most dynamic neighborhoods. Surrounded by craft breweries, innovative restaurants, and easy access to I-95 and public transit.",
	},
	{
		id: 'property-013',
		address: '9045 Lake Shore Drive',
		city: 'Minneapolis',
		state: 'MN',
		price: 550000,
		beds: 4,
		baths: 3,
		sqft: 2350,
		property_type: 'SFH',
		highlights: [
			'Lake views from multiple rooms',
			"Updated chef's kitchen",
			'Screened porch for summer',
			'Finished lower level',
			'Two-car heated garage',
		],
		neighborhood_description:
			'Desirable Lake Harriet location with direct access to walking and biking trails around the lake. Near the Rose Gardens, bandshell concerts, and Linden Hills shops.',
	},
	{
		id: 'property-014',
		address: '612 Music Row Circle',
		city: 'Nashville',
		state: 'TN',
		price: 425000,
		beds: 2,
		baths: 2,
		sqft: 1250,
		property_type: 'condo',
		highlights: [
			'Modern industrial design',
			'10-foot ceilings',
			'Walk-in closets',
			'Rooftop community space',
		],
		neighborhood_description:
			"The Gulch location in Nashville's most walkable neighborhood. Steps from live music venues, trendy restaurants, and the downtown honky-tonks of Lower Broadway.",
	},
	{
		id: 'property-015',
		address: '3300 Desert Vista Lane',
		city: 'Scottsdale',
		state: 'AZ',
		price: 1250000,
		beds: 4,
		baths: 4,
		sqft: 3200,
		property_type: 'SFH',
		highlights: [
			'Infinity pool with spa',
			'Gourmet outdoor kitchen',
			'Wine cellar',
			'Guest casita',
			'Premium golf course views',
		],
		neighborhood_description:
			'Exclusive North Scottsdale community with 24-hour security. Adjacent to world-class golf courses, hiking at McDowell Sonoran Preserve, and the fine dining of Kierland Commons.',
	},
];

// Mock clients data from apps/realty-ai/src/data/mockClients.ts
const mockClients = [
	{
		id: 'client-001',
		name: 'Sarah Mitchell',
		email: 'sarah.mitchell@email.com',
		buying_stage: 'ready_to_offer',
		preferences: ['open floor plan', 'updated kitchen', 'home office space'],
		budget_range: '$450,000 - $550,000',
		lifestyle_notes:
			'Remote worker, enjoys hosting dinner parties, has two cats',
		communication_style: 'enthusiastic',
	},
	{
		id: 'client-002',
		name: 'James Chen',
		email: 'jchen@techcorp.io',
		buying_stage: 'active',
		preferences: ['modern design', 'smart home features', 'garage'],
		budget_range: '$600,000 - $750,000',
		lifestyle_notes:
			'Tech executive, values efficiency, commutes to downtown office 3 days/week',
		communication_style: 'formal',
	},
	{
		id: 'client-003',
		name: 'Maria Rodriguez',
		email: 'maria.r@gmail.com',
		buying_stage: 'browsing',
		preferences: ['good schools nearby', 'backyard', 'quiet neighborhood'],
		budget_range: '$350,000 - $450,000',
		lifestyle_notes: 'Young family with two kids, looking for their first home',
		communication_style: 'casual',
	},
	{
		id: 'client-004',
		name: 'Robert Thompson',
		email: 'rthompson@lawfirm.com',
		buying_stage: 'ready_to_offer',
		preferences: ['downtown location', 'luxury finishes', 'concierge'],
		budget_range: '$800,000 - $1,200,000',
		lifestyle_notes:
			'Senior attorney, recently divorced, downsizing from suburban home',
		communication_style: 'formal',
	},
	{
		id: 'client-005',
		name: 'Emily Nakamura',
		email: 'emily.nakamura@outlook.com',
		buying_stage: 'active',
		preferences: ['natural light', 'walkable area', 'pet-friendly'],
		budget_range: '$400,000 - $500,000',
		lifestyle_notes:
			'Nurse, works night shifts, has a golden retriever named Max',
		communication_style: 'enthusiastic',
	},
	{
		id: 'client-006',
		name: 'David Williams',
		email: 'dwilliams@university.edu',
		buying_stage: 'browsing',
		preferences: ['historic character', 'large yard', 'quiet street'],
		budget_range: '$500,000 - $650,000',
		lifestyle_notes:
			'University professor, avid gardener, enjoys woodworking in spare time',
		communication_style: 'casual',
	},
	{
		id: 'client-007',
		name: 'Jennifer Park',
		email: 'jpark@designstudio.com',
		buying_stage: 'active',
		preferences: ['loft style', 'exposed brick', 'high ceilings'],
		budget_range: '$550,000 - $700,000',
		lifestyle_notes:
			'Interior designer, needs space for home studio, hosts client meetings',
		communication_style: 'enthusiastic',
	},
	{
		id: 'client-008',
		name: 'Michael Anderson',
		email: 'manderson@retirement.net',
		buying_stage: 'ready_to_offer',
		preferences: ['single story', 'low maintenance', 'community amenities'],
		budget_range: '$300,000 - $400,000',
		lifestyle_notes:
			'Recently retired, wants to be near grandchildren, enjoys golf and tennis',
		communication_style: 'formal',
	},
	{
		id: 'client-009',
		name: 'Ashley Turner',
		email: 'ashley.turner@startup.io',
		buying_stage: 'browsing',
		preferences: ['energy efficient', 'modern kitchen', 'outdoor space'],
		budget_range: '$425,000 - $525,000',
		lifestyle_notes:
			'Startup founder, environmentally conscious, loves cooking',
		communication_style: 'casual',
	},
	{
		id: 'client-010',
		name: 'Christopher Lee',
		email: 'clee@hospital.org',
		buying_stage: 'active',
		preferences: ['close to work', 'secure parking', 'gym access'],
		budget_range: '$350,000 - $450,000',
		lifestyle_notes:
			'ER doctor with unpredictable hours, values convenience and security',
		communication_style: 'formal',
	},
	{
		id: 'client-011',
		name: 'Rachel Green',
		email: 'rgreen@fashionmail.com',
		buying_stage: 'ready_to_offer',
		preferences: ['walk-in closet', 'ensuite bathroom', 'city views'],
		budget_range: '$700,000 - $900,000',
		lifestyle_notes:
			'Fashion buyer, travels frequently, wants a stylish urban retreat',
		communication_style: 'enthusiastic',
	},
	{
		id: 'client-012',
		name: 'Thomas Murphy',
		email: 'tmurphy@construction.com',
		buying_stage: 'browsing',
		preferences: ['workshop space', 'large garage', 'acreage'],
		budget_range: '$400,000 - $550,000',
		lifestyle_notes:
			'Construction manager, restores classic cars as a hobby, needs storage space',
		communication_style: 'casual',
	},
	{
		id: 'client-013',
		name: 'Lisa Patel',
		email: 'lisa.patel@consulting.com',
		buying_stage: 'active',
		preferences: ['gourmet kitchen', 'entertainment space', 'pool'],
		budget_range: '$900,000 - $1,300,000',
		lifestyle_notes:
			'Management consultant, loves entertaining, relocating from New York',
		communication_style: 'formal',
	},
	{
		id: 'client-014',
		name: "Kevin O'Brien",
		email: 'kobrien@music.edu',
		buying_stage: 'browsing',
		preferences: ['soundproof room', 'basement', 'separate entrance'],
		budget_range: '$375,000 - $475,000',
		lifestyle_notes:
			'Music teacher, plays piano and guitar, occasionally has students over',
		communication_style: 'enthusiastic',
	},
	{
		id: 'client-015',
		name: 'Amanda Foster',
		email: 'afoster@nonprofit.org',
		buying_stage: 'ready_to_offer',
		preferences: ['eco-friendly', 'community garden access', 'bike storage'],
		budget_range: '$325,000 - $425,000',
		lifestyle_notes:
			'Nonprofit director, passionate about sustainability, bikes to work daily',
		communication_style: 'casual',
	},
];

function createSlug(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.trim();
}

async function seed(): Promise<void> {
	console.log('Starting database seed...\n');

	const dataSource = new DataSource(getTypeOrmConfig());

	try {
		await dataSource.initialize();
		console.log('✅ Connected to database\n');

		const propertyRepository = dataSource.getRepository(Property);
		const clientRepository = dataSource.getRepository(Client);

		// Clear existing data
		console.log('Clearing existing data...');
		await clientRepository.createQueryBuilder().delete().execute();
		await propertyRepository.createQueryBuilder().delete().execute();
		console.log('✅ Existing data cleared\n');

		// Seed properties
		console.log('Seeding properties...');
		for (const mockProperty of mockProperties) {
			const payload: PropertyPayload = {
				address: mockProperty.address,
				city: mockProperty.city,
				state: mockProperty.state,
				price: mockProperty.price,
				beds: mockProperty.beds,
				baths: mockProperty.baths,
				sqft: mockProperty.sqft,
				property_type: mockProperty.property_type,
				highlights: mockProperty.highlights,
				neighborhood_description: mockProperty.neighborhood_description,
			};

			const property = propertyRepository.create({
				type: mockProperty.property_type,
				name: `${mockProperty.address}, ${mockProperty.city}`,
				slug: createSlug(`${mockProperty.address}-${mockProperty.city}`),
				payload,
				meta: { originalId: mockProperty.id },
			});

			await propertyRepository.save(property);
			console.log(`  ✓ ${property.name}`);
		}
		console.log(`✅ Seeded ${mockProperties.length} properties\n`);

		// Seed clients
		console.log('Seeding clients...');
		for (const mockClient of mockClients) {
			const payload: ClientPayload = {
				buying_stage: mockClient.buying_stage,
				preferences: mockClient.preferences,
				budget_range: mockClient.budget_range,
				lifestyle_notes: mockClient.lifestyle_notes,
				communication_style: mockClient.communication_style,
			};

			const client = clientRepository.create({
				type: 'buyer',
				name: mockClient.name,
				email: mockClient.email,
				slug: createSlug(mockClient.name),
				payload,
				meta: { originalId: mockClient.id },
			});

			await clientRepository.save(client);
			console.log(`  ✓ ${client.name} (${client.email})`);
		}
		console.log(`✅ Seeded ${mockClients.length} clients\n`);

		console.log('🎉 Database seeding complete!');
		console.log('');
		console.log('You can verify the data in GraphiQL at http://localhost:3001/graphiql');
		console.log('Try these queries:');
		console.log('  { allProperties { nodes { id name payload } } }');
		console.log('  { allClients { nodes { id name email payload } } }');
	} catch (error) {
		console.error('❌ Seed failed:');
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	} finally {
		await dataSource.destroy();
	}
}

seed();
