import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { prisma } from '../src/db/prisma';

async function main() {
  console.log('🧹 Leere Tabelle "champions" in PostgreSQL...');
  try {
    const result = await prisma.champion.deleteMany({});
    console.log(`✅ Tabelle "champions" erfolgreich geleert (${result.count} Einträge gelöscht).`);
  } catch (err) {
    console.error('❌ Fehler beim Leeren der champions Tabelle:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
