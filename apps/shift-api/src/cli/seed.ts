import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { getConfig } from '../config/postgres';
import { entities } from '../config/entities';
import { Facility, FacilityType } from '../modules/shift/entities/facility.entity';
import {
  Professional,
  Qualification,
} from '../modules/shift/entities/professional.entity';

const facilities: { name: string; type: FacilityType }[] = [
  { name: 'Sunrise Nursing Home', type: 'nursing_home' },
  { name: 'Metro General Hospital', type: 'hospital' },
  { name: 'Downtown Clinic', type: 'clinic' },
];

const professionals: { name: string; qualification: Qualification }[] = [
  { name: 'Alice Johnson', qualification: 'RN' },
  { name: 'Bob Smith', qualification: 'CNA' },
  { name: 'Carol Williams', qualification: 'LPN' },
  { name: 'David Brown', qualification: 'CNA' },
  { name: 'Eva Martinez', qualification: 'LPN' },
];

async function seed() {
  const pgConfig = getConfig();
  const dataSource = new DataSource({
    type: 'postgres',
    host: pgConfig.host,
    port: pgConfig.port,
    username: pgConfig.user,
    password: pgConfig.password,
    database: pgConfig.database,
    entities,
    synchronize: true,
    namingStrategy: new SnakeNamingStrategy(),
  });

  await dataSource.initialize();
  console.log('Connected to database');

  const facilityRepo = dataSource.getRepository(Facility);
  for (const f of facilities) {
    await facilityRepo.upsert(f, ['name']);
    console.log(`Upserted facility: ${f.name}`);
  }

  const professionalRepo = dataSource.getRepository(Professional);
  for (const p of professionals) {
    await professionalRepo.upsert(p, ['name']);
    console.log(`Upserted professional: ${p.name} (${p.qualification})`);
  }

  console.log('Seed complete');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
