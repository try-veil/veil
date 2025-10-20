import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/veil_platform');

async function applyMigrations() {
  try {
    console.log('📚 Reading migration file...');
    const migrationSQL = readFileSync(join(__dirname, 'drizzle/0000_far_nehzno.sql'), 'utf-8');

    console.log('🔄 Applying migrations to veil_platform database...');
    await sql.unsafe(migrationSQL);

    console.log('✅ Migrations applied successfully!');

    // Verify tables created
    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log('\n📋 Tables in database:');
    tables.forEach(t => console.log(`  - ${t.tablename}`));

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await sql.end();
    process.exit(1);
  }
}

applyMigrations();
