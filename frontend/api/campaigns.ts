import { getDatabase } from './_lib/db.js';
import { requireWallet } from './_lib/auth.js';
import { ensureUser } from './_lib/identity.js';

const walletPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MAX_URL_LENGTH = 2048;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function json(res: any, body: unknown, status = 200) {
  return res.status(status)
    .setHeader('Content-Type', 'application/json')
    .setHeader('X-Content-Type-Options', 'nosniff')
    .json(body);
}

function optionalUrl(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? [value] : [];
}

function rateLimit(req: any) {
  const key = String(req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || 'unknown').split(',')[0];
  const now = Date.now();
  const current = requestCounts.get(key);
  if (!current || current.resetAt <= now) {
    requestCounts.set(key, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  current.count += 1;
  return current.count > 20;
}

function campaign(row: any) {
  return {
    id: row.id, title: row.title, description: row.description,
    goal: String(row.goal), duration: String(row.duration_days), imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url ? [row.thumbnail_url] : [], creatorWalletAddress: row.creator_wallet_address,
    createdAt: String(new Date(row.created_at).getTime() * 1_000_000),
    endTimestamp: row.end_at ? [String(new Date(row.end_at).getTime() * 1_000_000)] : [],
    status: row.status, totalRaised: String(row.total_raised), donationCount: String(row.donation_count),
    websiteUrl: optionalUrl(row.website_url), twitterUrl: optionalUrl(row.twitter_url),
    telegramUrl: optionalUrl(row.telegram_url), category: row.category, isReported: row.is_reported,
    creatorDisplayName: row.creator_display_name,
  };
}

export default async function handler(req: any, res: any) {
  try {
    const sql = getDatabase();
    if (req.method === 'GET') {
      const id = typeof req.query?.id === 'string' ? req.query.id : '';
      const creator = typeof req.query?.creator === 'string' ? req.query.creator : '';
      const rows = id ? await sql`select * from campaigns where id = ${id} limit 1`
        : creator ? await sql`select * from campaigns where creator_wallet_address = ${creator} order by created_at desc`
          : await sql`select * from campaigns order by created_at desc`;
      if (!creator) res.setHeader('Cache-Control', id ? 'public, s-maxage=30, stale-while-revalidate=300' : 'public, s-maxage=60, stale-while-revalidate=600');
      return json(res, rows.map(campaign));
    }
    if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);
    if (rateLimit(req)) return json(res, { error: 'Too many campaign creation requests' }, 429);
    const body = req.body || {};
    const walletAddress = String(body.creatorWalletAddress || '');
    const title = String(body.title || '');
    const description = String(body.description || '');
    const goal = BigInt(body.goal || 0);
    const duration = Number(body.duration || 0);
    if (!walletPattern.test(walletAddress)) return json(res, { error: 'Invalid wallet address' }, 400);
    if (!title || title.length > 160) return json(res, { error: 'Invalid campaign title' }, 400);
    if (!description || description.length > 10000) return json(res, { error: 'Invalid campaign description' }, 400);
    if (goal <= 0n || duration < 0 || duration > 365) return json(res, { error: 'Invalid campaign limits' }, 400);
    const imageUrl = String(body.imageUrl || '');
    const thumbnailUrl = String(body.thumbnailUrl || '');
    if (!imageUrl.startsWith('https://res.cloudinary.com/') || !thumbnailUrl.startsWith('https://res.cloudinary.com/')) return json(res, { error: 'Campaign image must be uploaded through DropFund' }, 400);
    for (const value of [body.websiteUrl, body.twitterUrl, body.telegramUrl]) {
      if (value && String(value).length > MAX_URL_LENGTH) return json(res, { error: 'Campaign link is too long' }, 400);
    }
    const privyDid = await requireWallet(req, walletAddress);
    await ensureUser(sql, privyDid, walletAddress);
    const id = `${walletAddress}_${Date.now()}_${crypto.randomUUID()}`;
    const endAt = duration === 0 ? null : new Date(Date.now() + duration * 86400000);
    const rows = await sql`insert into campaigns (id, title, description, goal, duration_days, image_url, thumbnail_url, creator_wallet_address, creator_display_name, end_at, website_url, twitter_url, telegram_url)
      select ${id}, ${title}, ${description}, ${goal.toString()}, ${duration}, ${imageUrl}, ${thumbnailUrl || null}, ${walletAddress}, display_name, ${endAt}, ${body.websiteUrl || null}, ${body.twitterUrl || null}, ${body.telegramUrl || null}
      from users where privy_did = ${privyDid} returning *`;
    if (!rows[0]) return json(res, { error: 'Creator profile was not found' }, 409);
    return json(res, { id: rows[0].id });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Campaign API error:', error);
    return json(res, { error: 'Campaign request failed' }, 500);
  }
}