import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/veil_platform');

async function checkTables() {
  try {
    const tables = await sql`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    console.log('📋 Existing tables in veil_platform:');
    tables.forEach(t => console.log(`  ✓ ${t.tablename}`));

    const paxTables = [
      'credit_accounts',
      'credit_packages',
      'credit_purchases',
      'credit_reservations',
      'credit_transactions',
      'payment_transactions',
      'pricing_models',
      'proxy_apis',
      'proxy_routes',
      'refunds',
      'usage_records',
      'users',
      'webhook_events'
    ];

    console.log('\n🔍 Required PAX tables:');
    const existingTableNames = tables.map(t => t.tablename);
    const missingTables = paxTables.filter(t => !existingTableNames.includes(t));

    paxTables.forEach(t => {
      const exists = existingTableNames.includes(t);
      console.log(`  ${exists ? '✓' : '✗'} ${t}`);
    });

    if (missingTables.length > 0) {
      console.log('\n❌ Missing tables:', missingTables.join(', '));
    } else {
      console.log('\n✅ All required tables exist!');
    }

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkTables();
