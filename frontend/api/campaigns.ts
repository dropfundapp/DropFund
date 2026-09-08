import { sql } from './_lib/db';
import { requireWallet } from './_lib/auth';

const walletPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function json(res: any, body: unknown, status = 200) {
  return res.status(status).setHeader('Content-Type', 'application/json').json(body);
}

function campaign(row: any) {
  return {
    id: row.id, title: row.title, description: row.description,
    goal: String(row.goal), duration: String(row.duration_days), imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url ? [row.thumbnail_url] : [], creatorWalletAddress: row.creator_wallet_address,
    createdAt: String(new Date(row.created_at).getTime() * 1_000_000),
    endTimestamp: row.end_at ? [String(new Date(row.end_at).getTime() * 1_000_000)] : [],
    status: row.status, totalRaised: String(row.total_raised), donationCount: String(row.donation_count),
    websiteUrl: row.website_url ? [row.website_url] : [], twitterUrl: row.twitter_url ? [row.twitter_url] : [],
    telegramUrl: row.telegram_url ? [row.telegram_url] : [], category: row.category,
  };
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const id = typeof req.query?.id === 'string' ? req.query.id : '';
      const creator = typeof req.query?.creator === 'string' ? req.query.creator : '';
      const rows = id ? await sql`select * from campaigns where id = ${id} limit 1`
        : creator ? await sql`select * from campaigns where creator_wallet_address = ${creator} order by created_at desc`
          : await sql`select * from campaigns order by created_at desc`;
      return json(res, rows.map(campaign));
    }
    if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);
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
    await requireWallet(req, walletAddress);
    const id = `${walletAddress}_${Date.now()}_${crypto.randomUUID()}`;
    const endAt = duration === 0 ? null : new Date(Date.now() + duration * 86400000);
    const rows = await sql`insert into campaigns (id, title, description, goal, duration_days, image_url, thumbnail_url, creator_wallet_address, end_at, website_url, twitter_url, telegram_url)
      values (${id}, ${title}, ${description}, ${goal.toString()}, ${duration}, ${String(body.imageUrl || '')}, ${body.thumbnailUrl || null}, ${walletAddress}, ${endAt}, ${body.websiteUrl || null}, ${body.twitterUrl || null}, ${body.telegramUrl || null}) returning *`;
    return json(res, { id: rows[0].id });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Campaign API error:', error);
    return json(res, { error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
}