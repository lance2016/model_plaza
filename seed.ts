import { getDb } from './lib/db';

// Just calling getDb() triggers auto-seed if the database is empty
const db = getDb();

const providerCount = (db.prepare('SELECT COUNT(*) as count FROM providers').get() as { count: number }).count;
const modelCount = (db.prepare('SELECT COUNT(*) as count FROM models').get() as { count: number }).count;

console.log(`Seed complete: ${providerCount} providers, ${modelCount} models.`);
