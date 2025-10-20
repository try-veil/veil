import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/veil_platform');

async function applyPaxTables() {
  try {
    console.log('🔄 Creating PAX-specific tables...\n');

    // Create tables in dependency order

    // 1. Credit Accounts (no dependencies)
    console.log('Creating credit_accounts...');
    await sql`
      CREATE TABLE IF NOT EXISTS "credit_accounts" (
        "id" serial PRIMARY KEY NOT NULL,
        "uid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
        "user_id" integer NOT NULL,
        "balance" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
        "reserved_balance" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
        "total_credits" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
        "total_spent" numeric(12, 4) DEFAULT '0.0000' NOT NULL,
        "currency" varchar(3) DEFAULT 'INR' NOT NULL,
        "low_balance_threshold" numeric(12, 4) DEFAULT '10.0000',
        "auto_recharge_enabled" boolean DEFAULT false NOT NULL,
        "auto_recharge_amount" numeric(12, 4) DEFAULT '100.0000',
        "auto_recharge_threshold" numeric(12, 4) DEFAULT '5.0000',
        "is_active" boolean DEFAULT true NOT NULL,
        "is_suspended" boolean DEFAULT false NOT NULL,
        "suspension_reason" text,
        "last_transaction_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `;

    // 2. Credit Packages (no dependencies)
    console.log('Creating credit_packages...');
    await sql`
      CREATE TABLE IF NOT EXISTS "credit_packages" (
        "id" serial PRIMARY KEY NOT NULL,
        "uid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
        "name" varchar(100) NOT NULL,
        "description" text,
        "credits" numeric(12, 4) NOT NULL,
        "price" numeric(10, 2) NOT NULL,
        "currency" varchar(3) DEFAULT 'INR' NOT NULL,
        "bonus_credits" numeric(12, 4) DEFAULT '0.0000',
        "is_popular" boolean DEFAULT false NOT NULL,
        "display_order" integer DEFAULT 0 NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `;

    // 3. Payment Transactions (no dependencies)
    console.log('Creating payment_transactions...');
    await sql`
      CREATE TABLE IF NOT EXISTS "payment_transactions" (
        "id" serial PRIMARY KEY NOT NULL,
        "uid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
        "user_id" integer NOT NULL,
        "provider" varchar(50) NOT NULL,
        "provider_transaction_id" varchar(255) UNIQUE,
        "provider_order_id" varchar(255),
        "amount" numeric(10, 2) NOT NULL,
        "currency" varchar(3) DEFAULT 'INR' NOT NULL,
        "status" varchar(20) NOT NULL,
        "payment_method" varchar(50),
        "metadata" jsonb,
        "webhook_received" boolean DEFAULT false NOT NULL,
        "webhook_processed_at" timestamp,
        "error_code" varchar(100),
        "error_description" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "completed_at" timestamp
      )
    `;

    // 4. Credit Transactions (depends on credit_accounts)
    console.log('Creating credit_transactions...');
    await sql`
      CREATE TABLE IF NOT EXISTS "credit_transactions" (
        "id" serial PRIMARY KEY NOT NULL,
        "uid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
        "credit_account_id" integer NOT NULL REFERENCES "credit_accounts"("id"),
        "type" varchar(20) NOT NULL,
        "amount" numeric(12, 4) NOT NULL,
        "balance_before" numeric(12, 4) NOT NULL,
        "balance_after" numeric(12, 4) NOT NULL,
        "reserved_balance_before" numeric(12, 4),
        "reserved_balance_after" numeric(12, 4),
        "reference_type" varchar(50),
        "reference_id" varchar(255),
        "description" text,
        "metadata" jsonb,
        "status" varchar(20) DEFAULT 'completed' NOT NULL,
        "reversed_by" integer REFERENCES "credit_transactions"("id"),
        "reversed_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `;

    // 5. Credit Reservations (depends on credit_accounts, credit_transactions)
    console.log('Creating credit_reservations...');
    await sql`
      CREATE TABLE IF NOT EXISTS "credit_reservations" (
        "id" serial PRIMARY KEY NOT NULL,
        "uid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
        "credit_account_id" integer NOT NULL REFERENCES "credit_accounts"("id"),
        "transaction_id" integer REFERENCES "credit_transactions"("id"),
        "amount" numeric(12, 4) NOT NULL,
        "purpose" varchar(50) NOT NULL,
        "reference_type" varchar(50),
        "reference_id" varchar(255),
        "status" varchar(20) DEFAULT 'active' NOT NULL,
        "settled_amount" numeric(12, 4),
        "settled_at" timestamp,
        "settle_transaction_id" integer REFERENCES "credit_transactions"("id"),
        "released_amount" numeric(12, 4),
        "released_at" timestamp,
        "release_transaction_id" integer REFERENCES "credit_transactions"("id"),
        "expires_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `;

    // 6. Credit Purchases (depends on credit_accounts, credit_packages, payment_transactions, credit_transactions)
    console.log('Creating credit_purchases...');
    await sql`
      CREATE TABLE IF NOT EXISTS "credit_purchases" (
        "id" serial PRIMARY KEY NOT NULL,
        "uid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
        "credit_account_id" integer NOT NULL REFERENCES "credit_accounts"("id"),
        "package_id" integer REFERENCES "credit_packages"("id"),
        "payment_transaction_id" integer REFERENCES "payment_transactions"("id"),
        "credits" numeric(12, 4) NOT NULL,
        "bonus_credits" numeric(12, 4) DEFAULT '0.0000',
        "total_credits" numeric(12, 4) NOT NULL,
        "price" numeric(10, 2) NOT NULL,
        "currency" varchar(3) NOT NULL,
        "status" varchar(20) DEFAULT 'pending' NOT NULL,
        "credited_at" timestamp,
        "credit_transaction_id" integer REFERENCES "credit_transactions"("id"),
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `;

    // 7. Refunds (depends on payment_transactions)
    console.log('Creating refunds...');
    await sql`
      CREATE TABLE IF NOT EXISTS "refunds" (
        "id" serial PRIMARY KEY NOT NULL,
        "uid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
        "payment_transaction_id" integer NOT NULL REFERENCES "payment_transactions"("id"),
        "provider_refund_id" varchar(255) UNIQUE,
        "amount" numeric(10, 2) NOT NULL,
        "currency" varchar(3) DEFAULT 'INR' NOT NULL,
        "status" varchar(20) NOT NULL,
        "reason" text,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        "completed_at" timestamp
      )
    `;

    // 8. Pricing Models (no dependencies)
    console.log('Creating pricing_models...');
    await sql`
      CREATE TABLE IF NOT EXISTS "pricing_models" (
        "id" serial PRIMARY KEY NOT NULL,
        "uid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
        "name" varchar(100) NOT NULL,
        "type" varchar(20) NOT NULL,
        "base_cost" numeric(10, 6) DEFAULT '0.000000',
        "cost_per_kb_request" numeric(10, 6) DEFAULT '0.000000',
        "cost_per_kb_response" numeric(10, 6) DEFAULT '0.000000',
        "cost_per_minute" numeric(10, 6) DEFAULT '0.000000',
        "tiers" jsonb,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `;

    // 9. Proxy APIs (no dependencies)
    console.log('Creating proxy_apis...');
    await sql`
      CREATE TABLE IF NOT EXISTS "proxy_apis" (
        "id" serial PRIMARY KEY NOT NULL,
        "uid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
        "slug" varchar(100) NOT NULL UNIQUE,
        "name" varchar(200) NOT NULL,
        "description" text,
        "upstream_url" varchar(500) NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "default_pricing_model_id" integer,
        "default_headers" jsonb,
        "strip_headers" jsonb,
        "timeout_seconds" integer DEFAULT 30 NOT NULL,
        "rate_limit_per_minute" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `;

    // 10. Proxy Routes (depends on proxy_apis)
    console.log('Creating proxy_routes...');
    await sql`
      CREATE TABLE IF NOT EXISTS "proxy_routes" (
        "id" serial PRIMARY KEY NOT NULL,
        "uid" uuid DEFAULT gen_random_uuid() NOT NULL UNIQUE,
        "api_id" integer NOT NULL REFERENCES "proxy_apis"("id"),
        "path_pattern" varchar(500) NOT NULL,
        "method" varchar(10) NOT NULL,
        "pricing_model_id" integer,
        "rate_limit_per_minute" integer,
        "timeout_seconds" integer,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      )
    `;

    // Create indexes
    console.log('\n🔧 Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS credit_accounts_user_idx ON credit_accounts(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS credit_accounts_balance_idx ON credit_accounts(balance)`;
    await sql`CREATE INDEX IF NOT EXISTS credit_accounts_active_idx ON credit_accounts(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS payment_tx_user_idx ON payment_transactions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS payment_tx_provider_idx ON payment_transactions(provider)`;
    await sql`CREATE INDEX IF NOT EXISTS payment_tx_status_idx ON payment_transactions(status)`;
    await sql`CREATE INDEX IF NOT EXISTS credit_tx_account_idx ON credit_transactions(credit_account_id)`;
    await sql`CREATE INDEX IF NOT EXISTS credit_tx_type_idx ON credit_transactions(type)`;
    await sql`CREATE INDEX IF NOT EXISTS credit_res_account_idx ON credit_reservations(credit_account_id)`;
    await sql`CREATE INDEX IF NOT EXISTS credit_res_status_idx ON credit_reservations(status)`;
    await sql`CREATE INDEX IF NOT EXISTS proxy_apis_slug_idx ON proxy_apis(slug)`;
    await sql`CREATE INDEX IF NOT EXISTS proxy_routes_api_idx ON proxy_routes(api_id)`;

    console.log('\n✅ All PAX tables created successfully!');

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating tables:', error);
    await sql.end();
    process.exit(1);
  }
}

applyPaxTables();
