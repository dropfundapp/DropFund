import { getDatabase } from './_lib/db.js';
import { requireWallet } from './_lib/auth.js';

function json(res: any, body: unknown, status = 200) {
  return res.status(status).setHeader('Content-Type', 'application/json').setHeader('X-Content-Type-Options', 'nosniff').json(body);
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);
    const campaignId = String(req.body?.campaignId || '');
    const walletAddress = String(req.body?.walletAddress || '');
    const reason = String(req.body?.reason || 'Campaign content concern').trim();
    if (!campaignId || !reason || reason.length > 1000) return json(res, { error: 'Invalid report' }, 400);
    await requireWallet(req, walletAddress);
    const sql = getDatabase();
    const result = await sql`
      with inserted as (
        insert into campaign_reports (campaign_id, reporter_wallet_address, reason)
        values (${campaignId}, ${walletAddress}, ${reason})
        on conflict (campaign_id, reporter_wallet_address) do nothing
        returning campaign_id
      ), updated as (
        update campaigns
        set report_count = report_count + 1,
            is_reported = true
        where id = ${campaignId} and exists (select 1 from inserted)
        returning id
      )
      select (select count(*)::int from inserted) as inserted_count
    `;
    if (!result[0]?.inserted_count) return json(res, { error: 'You have already reported this campaign' }, 409);
    return json(res, { ok: true }, 201);
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Report API error:', error);
    return json(res, { error: 'Unable to submit report' }, 500);
  }
}