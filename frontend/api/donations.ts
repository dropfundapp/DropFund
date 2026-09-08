import { getDatabase } from './_lib/db.js';
import { requireWallet } from './_lib/auth.js';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const walletPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function json(res: any, body: unknown, status = 200) {
  return res.status(status).setHeader('Content-Type', 'application/json').json(body);
}

async function getTransaction(signature: string) {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl) throw new Error('SOLANA_RPC_URL is not configured');
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTransaction',
      params: [signature, { encoding: 'jsonParsed', commitment: 'confirmed', maxSupportedTransactionVersion: 0 }],
    }),
  });
  if (!response.ok) throw new Error('Solana RPC request failed');
  const payload = await response.json();
  if (payload.error || !payload.result) throw new Error('Transaction was not found');
  return payload.result;
}

function tokenDelta(transaction: any, walletAddress: string) {
  const before = new Map<string, number>();
  const after = new Map<string, number>();
  for (const item of transaction.meta?.preTokenBalances || []) {
    if (item.owner === walletAddress && item.mint === USDC_MINT) before.set(item.owner, (before.get(item.owner) || 0) + Number(item.uiTokenAmount.amount));
  }
  for (const item of transaction.meta?.postTokenBalances || []) {
    if (item.owner === walletAddress && item.mint === USDC_MINT) after.set(item.owner, (after.get(item.owner) || 0) + Number(item.uiTokenAmount.amount));
  }
  return (after.get(walletAddress) || 0) - (before.get(walletAddress) || 0);
}

export default async function handler(req: any, res: any) {
  try {
    const sql = getDatabase();
    if (req.method === 'GET') {
      const campaignId = typeof req.query?.campaignId === 'string' ? req.query.campaignId : '';
      const donorWalletAddress = typeof req.query?.donorWalletAddress === 'string' ? req.query.donorWalletAddress : '';
      const rows = campaignId
        ? await sql`select * from donations where campaign_id = ${campaignId} order by created_at desc`
        : donorWalletAddress
          ? await sql`select * from donations where donor_wallet_address = ${donorWalletAddress} order by created_at desc`
          : [];
      return json(res, rows.map((row: any) => ({
        mainTransactionSignature: row.transaction_signature,
        feeTransactionSignature: row.fee_transaction_signature,
        amount: String(row.amount),
        feeAmount: String(row.fee_amount),
        donorWalletAddress: row.donor_wallet_address,
        campaignId: row.campaign_id,
        timestamp: String(new Date(row.created_at).getTime() * 1_000_000),
      })));
    }
    if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);
    const body = req.body || {};
    const signature = String(body.mainTransactionSignature || '');
    const donorWalletAddress = String(body.donorWalletAddress || '');
    const campaignId = String(body.campaignId || '');
    const amount = BigInt(body.amount || 0);
    if (!signature || signature.length > 200 || !campaignId || !walletPattern.test(donorWalletAddress) || amount <= 0n) {
      return json(res, { error: 'Invalid donation request' }, 400);
    }
    await requireWallet(req, donorWalletAddress);

    const campaigns = await sql`select * from campaigns where id = ${campaignId} limit 1`;
    const campaign = campaigns[0];
    if (!campaign) return json(res, { error: 'Campaign not found' }, 404);
    if (campaign.status === 'funded' || campaign.status === 'ended') return json(res, { error: 'Campaign is not accepting donations' }, 409);

    const transaction = await getTransaction(signature);
    if (transaction.meta?.err) return json(res, { error: 'Solana transaction failed' }, 400);
    const donorDelta = tokenDelta(transaction, donorWalletAddress);
    const recipientDelta = tokenDelta(transaction, campaign.creator_wallet_address);
    if (donorDelta > -Number(amount) || recipientDelta < Number(amount)) {
      return json(res, { error: 'Transaction does not match the requested USDC donation' }, 400);
    }

    const inserted = await sql`
      insert into donations (transaction_signature, amount, donor_wallet_address, campaign_id, created_at)
      values (${signature}, ${amount.toString()}, ${donorWalletAddress}, ${campaignId}, now())
      on conflict (transaction_signature) do nothing
      returning *
    `;
    if (!inserted.length) return json(res, { error: 'Donation transaction already recorded' }, 409);

    const nextRaised = BigInt(campaign.total_raised) + amount;
    const nextStatus = nextRaised >= BigInt(campaign.goal) ? 'goal_reached' : campaign.status;
    await sql`update campaigns set total_raised = ${nextRaised.toString()}, donation_count = donation_count + 1, status = ${nextStatus} where id = ${campaignId}`;
    return json(res, { ok: true, donation: inserted[0] }, 201);
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error(error);
    return json(res, { error: 'Internal server error' }, 500);
  }
}
