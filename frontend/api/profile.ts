import { getDatabase } from './_lib/db.js';
import { requireWallet } from './_lib/auth.js';
import { ensureUser } from './_lib/identity.js';

function json(res: any, body: unknown, status = 200) {
  return res.status(status).setHeader('Content-Type', 'application/json').json(body);
}

export default async function handler(req: any, res: any) {
  try {
    const sql = getDatabase();
    const walletAddress = String(req.query?.walletAddress || req.body?.walletAddress || '');
    if (!walletAddress) return json(res, { error: 'Wallet address is required' }, 400);
    const privyDid = await requireWallet(req, walletAddress);
    await ensureUser(sql, privyDid, walletAddress);
    if (req.method === 'GET') {
      const rows = await sql`select solana_address, display_name, image_url, name_change_count from users where privy_did = ${privyDid} limit 1`;
      const user = rows[0];
      return json(res, {
        name: user.display_name,
        walletAddress: user.solana_address,
        image: user.image_url,
        canChangeName: user.name_change_count === 0,
      });
    }
    if (req.method !== 'PUT') return json(res, { error: 'Method not allowed' }, 405);
    const name = String(req.body?.name || '').trim();
    const image = req.body?.image ? String(req.body.image) : null;
    if (!name || name.length > 50 || (image && image.length > 2_000_000)) return json(res, { error: 'Invalid profile data' }, 400);
    const updated = await sql`
      with prior as (
        select display_name, name_change_count
        from users
        where privy_did = ${privyDid}
      ), changed as (
        update users user_record
        set display_name = ${name},
            image_url = ${image},
            name_change_count = case when user_record.display_name = ${name} then user_record.name_change_count else 1 end,
            updated_at = now()
        from prior
        where user_record.privy_did = ${privyDid}
          and (user_record.display_name = ${name} or prior.name_change_count = 0)
        returning prior.display_name as old_name, user_record.display_name as new_name, user_record.name_change_count
      ), logged as (
        insert into user_name_history (privy_did, old_name, new_name)
        select ${privyDid}, old_name, new_name from changed where old_name <> new_name
      )
      select new_name as name, name_change_count from changed
    `;
    if (!updated[0]) return json(res, { error: 'Display name is permanently locked' }, 403);
    return json(res, { ok: true, name: updated[0].name, canChangeName: updated[0].name_change_count === 0 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error(error);
    return json(res, { error: 'Internal server error' }, 500);
  }
}
