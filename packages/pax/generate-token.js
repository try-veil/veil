#!/usr/bin/env bun

// Quick JWT token generator for testing PAX payment endpoints
// Usage: bun generate-token.js [userId] [email]

import { SignJWT } from 'jose';

const userId = process.argv[2] || '1';
const email = process.argv[3] || 'test@example.com';
const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const payload = {
  id: parseInt(userId),
  userId: parseInt(userId),
  email: email,
  role: 'user'
};

const secret = new TextEncoder().encode(jwtSecret);

const token = await new SignJWT(payload)
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setExpirationTime('24h')
  .sign(secret);

console.log('\n=== JWT Token Generated ===\n');
console.log('Token:', token);
console.log('\nPayload:', JSON.stringify(payload, null, 2));
console.log('\n=== Usage ===');
console.log('curl -X POST http://localhost:3002/api/v1/payments/create \\');
console.log('  -H "Authorization: Bearer ' + token + '" \\');
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"amount": 100, "currency": "INR", "description": "Test payment"}\' | jq');
console.log('\n');
