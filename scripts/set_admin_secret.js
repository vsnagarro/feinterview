#!/usr/bin/env node
// One-time script to set ADMIN_API_SECRET in .env.local (if missing).
// Usage: node scripts/set_admin_secret.js

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
let contents = '';
if (existsSync(envPath)) {
  contents = readFileSync(envPath, 'utf8');
}

const key = 'ADMIN_API_SECRET';
if (new RegExp('^' + key + '=', 'm').test(contents)) {
  console.log(`${key} already present in .env.local`);
  process.exit(0);
}

const secret = randomBytes(24).toString('hex');
const toAppend = `\n# Admin API secret for protected routes (set securely in production)\nADMIN_API_SECRET=${secret}\n`;
writeFileSync(envPath, contents + toAppend, { encoding: 'utf8' });
console.log(`Wrote ${key} to .env.local with value: ${secret}`);
console.log('Please set ADMIN_API_SECRET in your deployment environment as well.');
