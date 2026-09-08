import { getDatabase } from './_lib/db.js';
import { requireWallet } from './_lib/auth.js';

function json(res: any, body: unknown, status = 200) {
  return res.status(status).setHeader('Content-Type', 'application/json').json(body);
}

export default async function handler(req: any, res: any) {
  try {
    const sql = getDatabase();
    const walletAddress = String(req.query?.walletAddress || req.body?.walletAddress || '');
    if (!walletAddress) return json(res, { error: 'Wallet address is required' }, 400);
    if (req.method === 'GET') {
      const rows = await sql`select wallet_address, name, image_url from profiles where wallet_address = ${walletAddress} limit 1`;
      return json(res, rows[0] ? { name: rows[0].name, walletAddress: rows[0].wallet_address, image: rows[0].image_url } : null);
    }
    if (req.method !== 'PUT') return json(res, { error: 'Method not allowed' }, 405);
    await requireWallet(req, walletAddress);
    const name = String(req.body?.name || '').trim();
    const image = req.body?.image ? String(req.body.image) : null;
    if (name.length > 64 || (image && image.length > 2_000_000)) return json(res, { error: 'Profile data is too large' }, 400);
    await sql`
      insert into profiles (wallet_address, name, image_url)
      values (${walletAddress}, ${name}, ${image})
      on conflict (wallet_address) do update set name = excluded.name, image_url = excluded.image_url, updated_at = now()
    `;
    return json(res, { ok: true });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error(error);
    return json(res, { error: 'Internal server error' }, 500);
  }
}
