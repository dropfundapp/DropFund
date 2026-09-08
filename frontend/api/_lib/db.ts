import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured. Add it to the local Vercel environment.');
}

export const sql = neon(process.env.DATABASE_URL);
