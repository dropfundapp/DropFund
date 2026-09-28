import { getDatabase } from './_lib/db.js';

function json(res: any, body: unknown, status = 200) {
  return res.status(status)
    .setHeader('Content-Type', 'application/json')
    .setHeader('X-Content-Type-Options', 'nosniff')
    .json(body);
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') return json(res, { error: 'Method not allowed' }, 405);
    const sql = getDatabase();
    const rows = await sql`
      select * from (
        select
          concat('campaign:', campaigns.id) as id,
          'campaign' as type,
          campaigns.id as campaign_id,
          campaigns.title as campaign_title,
          campaigns.thumbnail_url as image_url,
          campaigns.creator_display_name as actor_name,
          null::bigint as amount,
          campaigns.created_at as created_at
        from campaigns
        union all
        select
          concat('donation:', donations.transaction_signature) as id,
          'donation' as type,
          campaigns.id as campaign_id,
          campaigns.title as campaign_title,
          campaigns.thumbnail_url as image_url,
          coalesce(nullif(users.display_name, ''), 'Dropfund supporter') as actor_name,
          donations.amount as amount,
          donations.created_at as created_at
        from donations
        join campaigns on campaigns.id = donations.campaign_id
        left join users on users.solana_address = donations.donor_wallet_address
      ) activity
      order by created_at desc
      limit 50
    `;
    return json(res, rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      campaignId: row.campaign_id,
      campaignTitle: row.campaign_title,
      imageUrl: row.image_url || '',
      actorName: row.actor_name,
      amount: row.amount === null ? undefined : String(row.amount),
      timestamp: String(new Date(row.created_at).getTime() * 1_000_000),
    })));
  } catch (error) {
    console.error('Discovery feed API error:', error);
    return json(res, { error: 'Discovery feed request failed' }, 500);
  }
}
