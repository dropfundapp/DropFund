import { getDatabase } from './_lib/db.js';
import { requireWallet } from './_lib/auth.js';

const walletPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MAX_COMMENT_LENGTH = 500;

function json(res: any, body: unknown, status = 200) {
  return res.status(status)
    .setHeader('Content-Type', 'application/json')
    .setHeader('X-Content-Type-Options', 'nosniff')
    .json(body);
}

export default async function handler(req: any, res: any) {
  try {
    const sql = getDatabase();
    if (req.method === 'GET') {
      const campaignId = typeof req.query?.campaignId === 'string' ? req.query.campaignId : '';
      if (!campaignId) return json(res, { error: 'Campaign ID is required' }, 400);
      const rows = await sql`
        select comments.id, comments.campaign_id, comments.author_wallet_address, comments.body, comments.created_at,
          coalesce(nullif(users.display_name, ''), 'Dropfund supporter') as author_name,
          users.image_url as author_image,
          (comments.author_wallet_address = campaigns.creator_wallet_address) as is_creator
        from campaign_comments comments
        join campaigns on campaigns.id = comments.campaign_id
        left join users on users.solana_address = comments.author_wallet_address
        where comments.campaign_id = ${campaignId}
        order by comments.created_at desc
        limit 100
      `;
      return json(res, rows.map((row: any) => ({
        id: String(row.id),
        campaignId: row.campaign_id,
        authorWalletAddress: row.author_wallet_address,
        authorName: row.author_name,
        authorImage: row.author_image || null,
        body: row.body,
        timestamp: String(new Date(row.created_at).getTime() * 1_000_000),
        isCreator: row.is_creator,
      })));
    }

    if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);
    const body = req.body || {};
    const campaignId = String(body.campaignId || '');
    const authorWalletAddress = String(body.authorWalletAddress || '');
    const comment = typeof body.body === 'string' ? body.body.trim() : '';
    if (!campaignId || !walletPattern.test(authorWalletAddress) || !comment || comment.length > MAX_COMMENT_LENGTH) {
      return json(res, { error: 'Invalid comment request' }, 400);
    }

    await requireWallet(req, authorWalletAddress);
    const campaigns = await sql`select creator_wallet_address from campaigns where id = ${campaignId} limit 1`;
    const campaign = campaigns[0];
    if (!campaign) return json(res, { error: 'Campaign not found' }, 404);

    const isCreator = campaign.creator_wallet_address === authorWalletAddress;
    const donations = isCreator ? [] : await sql`
      select transaction_signature from donations
      where campaign_id = ${campaignId} and donor_wallet_address = ${authorWalletAddress}
      limit 1
    `;
    if (!isCreator && !donations[0]) {
      return json(res, { error: 'Only confirmed donors can comment on this campaign' }, 403);
    }

    const rows = await sql`
      insert into campaign_comments (campaign_id, author_wallet_address, body)
      values (${campaignId}, ${authorWalletAddress}, ${comment})
      returning id, created_at
    `;
    return json(res, { id: String(rows[0].id), timestamp: String(new Date(rows[0].created_at).getTime() * 1_000_000) }, 201);
  } catch (error: any) {
    if (error instanceof Response) {
      const message = error.status === 401
        ? 'Unauthorized'
        : error.status === 503
          ? 'Privy server credentials are not configured. Set PRIVY_APP_ID and PRIVY_APP_SECRET, then restart Vercel dev.'
          : 'Request failed';
      return json(res, { error: message }, error.status || 400);
    }
    console.error('Comment API error:', error);
    return json(res, { error: 'Comment request failed' }, 500);
  }
}
