import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from '../src/db/prisma';

async function main() {
  console.log('🧹 Leere Tabelle "champion_snapshots" in PostgreSQL...');
  try {
    const result = await prisma.championSnapshot.deleteMany({});
    console.log(`✅ Tabelle "champion_snapshots" erfolgreich geleert (${result.count} Einträge gelöscht).`);
  } catch (err) {
    console.error('❌ Fehler beim Leeren der champion_snapshots Tabelle:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
