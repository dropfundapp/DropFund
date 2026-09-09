import { getDatabase } from './_lib/db.js';
import { requireWallet } from './_lib/auth.js';

const walletPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MAX_IMAGE_DATA_URL_LENGTH = 4_000_000;
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
    telegramUrl: optionalUrl(row.telegram_url), category: row.category,
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
    if (imageUrl.length > MAX_IMAGE_DATA_URL_LENGTH || thumbnailUrl.length > MAX_IMAGE_DATA_URL_LENGTH) return json(res, { error: 'Campaign image is too large' }, 413);
    for (const value of [body.websiteUrl, body.twitterUrl, body.telegramUrl]) {
      if (value && String(value).length > MAX_URL_LENGTH) return json(res, { error: 'Campaign link is too long' }, 400);
    }
    await requireWallet(req, walletAddress);
    const id = `${walletAddress}_${Date.now()}_${crypto.randomUUID()}`;
    const endAt = duration === 0 ? null : new Date(Date.now() + duration * 86400000);
    const rows = await sql`insert into campaigns (id, title, description, goal, duration_days, image_url, thumbnail_url, creator_wallet_address, end_at, website_url, twitter_url, telegram_url)
      values (${id}, ${title}, ${description}, ${goal.toString()}, ${duration}, ${imageUrl}, ${thumbnailUrl || null}, ${walletAddress}, ${endAt}, ${body.websiteUrl || null}, ${body.twitterUrl || null}, ${body.telegramUrl || null}) returning *`;
    return json(res, { id: rows[0].id });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Campaign API error:', error);
    return json(res, { error: 'Campaign request failed' }, 500);
  }
}