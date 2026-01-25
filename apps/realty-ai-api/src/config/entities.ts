import { Property } from '../modules/property/property.entity';
import { Client } from '../modules/client/client.entity';

/**
 * Entity registry for TypeORM
 * All entities must be registered here to be managed by TypeORM
 */
export const entities = [Property, Client];
