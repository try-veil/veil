-- Setup test data for PAX payment testing
-- Run this with: docker exec -i postgres15-dev psql -U postgres -d pax < setup-test-data.sql

-- Create test user credit account if not exists
INSERT INTO credit_accounts (
  user_id,
  balance,
  reserved_balance,
  total_credits,
  total_spent,
  low_balance_threshold,
  auto_recharge_enabled,
  auto_recharge_amount,
  status,
  created_at,
  updated_at
) VALUES (
  1,
  100.0000,
  0.0000,
  100.0000,
  0.0000,
  10.0000,
  false,
  50.0000,
  'active',
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  balance = GREATEST(credit_accounts.balance, 100.0000),
  updated_at = NOW();

-- Create test proxy API (JSONPlaceholder)
INSERT INTO proxy_apis (
  uid,
  slug,
  name,
  description,
  upstream_url,
  timeout_seconds,
  is_active,
  created_at,
  updated_at
) VALUES (
  'b211adce-e59d-4e45-8314-1e9046205473',
  'jsonplaceholder',
  'JSONPlaceholder Test API',
  'Free fake REST API for testing',
  'https://jsonplaceholder.typicode.com',
  30,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE SET
  is_active = true,
  updated_at = NOW();

-- Create pricing model (per-request)
INSERT INTO pricing_models (
  uid,
  name,
  type,
  base_cost,
  is_active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Standard Per Request',
  'per_request',
  0.001,
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

-- Create routes for JSONPlaceholder API
INSERT INTO proxy_routes (
  uid,
  api_uid,
  path_pattern,
  method,
  timeout_seconds,
  created_at,
  updated_at
) VALUES
  (gen_random_uuid(), 'b211adce-e59d-4e45-8314-1e9046205473', '/posts/{id}', 'GET', 30, NOW(), NOW()),
  (gen_random_uuid(), 'b211adce-e59d-4e45-8314-1e9046205473', '/posts', 'GET', 30, NOW(), NOW()),
  (gen_random_uuid(), 'b211adce-e59d-4e45-8314-1e9046205473', '/posts', 'POST', 30, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Link API to pricing model
UPDATE proxy_apis
SET pricing_model_uid = (SELECT uid FROM pricing_models WHERE type = 'per_request' LIMIT 1)
WHERE slug = 'jsonplaceholder';

-- Create test credit package
INSERT INTO credit_packages (
  uid,
  name,
  description,
  credits,
  price,
  currency,
  bonus_credits,
  is_active,
  display_order,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Test Starter Pack',
  'Test package for development',
  50.0000,
  10.00,
  'INR',
  5.0000,
  true,
  1,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

\echo 'Test data setup complete!'
\echo 'User ID: 1'
\echo 'Credit Balance: 100 credits'
\echo 'Test API: jsonplaceholder'
\echo 'Pricing: 0.001 credits per request'
