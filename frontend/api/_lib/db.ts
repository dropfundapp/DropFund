import { neon } from '@neondatabase/serverless';

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) {
    throw new Response('DATABASE_URL is not configured for this Vercel environment.', { status: 503 });
  }
  return neon(connectionString);
}
