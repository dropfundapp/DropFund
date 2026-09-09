import { getDatabase } from './_lib/db.js';
import { requireWallet } from './_lib/auth.js';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const walletPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function json(res: any, body: unknown, status = 200) {
  return res.status(status)
    .setHeader('Content-Type', 'application/json')
    .setHeader('X-Content-Type-Options', 'nosniff')
    .json(body);
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
  return current.count > 60;
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

async function tokenAccountInfo(rpcUrl: string, address: string, cache: Map<string, any>) {
  if (cache.has(address)) return cache.get(address);
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'getAccountInfo', params: [address, { encoding: 'jsonParsed', commitment: 'confirmed' }] }),
  });
  const payload = await response.json();
  const info = payload.result?.value?.data?.parsed?.info || null;
  cache.set(address, info);
  return info;
}

async function hasMatchingTransfer(transaction: any, rpcUrl: string, donorWalletAddress: string, creatorWalletAddress: string, amount: bigint) {
  const cache = new Map<string, any>();
  const instructions = [
    ...(transaction.transaction?.message?.instructions || []),
    ...(transaction.meta?.innerInstructions || []).flatMap((group: any) => group.instructions || []),
  ];
  for (const instruction of instructions) {
    const parsed = instruction.parsed;
    if (!parsed || instruction.program !== 'spl-token' || !['transfer', 'transferChecked'].includes(parsed.type)) continue;
    const info = parsed.info || {};
    const sourceInfo = await tokenAccountInfo(rpcUrl, info.source, cache);
    const destinationInfo = await tokenAccountInfo(rpcUrl, info.destination, cache);
    const transferredAmount = BigInt(info.tokenAmount?.amount || info.amount || 0);
    if (sourceInfo?.mint === USDC_MINT && destinationInfo?.mint === USDC_MINT && transferredAmount === amount && sourceInfo.owner === donorWalletAddress && destinationInfo.owner === creatorWalletAddress) {
      return true;
    }
  }
  return false;
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
    if (rateLimit(req)) return json(res, { error: 'Too many donation requests' }, 429);
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
    if (donorWalletAddress === campaign.creator_wallet_address) return json(res, { error: 'Campaign creators cannot donate to their own campaign' }, 403);
    if (campaign.status === 'funded' || campaign.status === 'ended') return json(res, { error: 'Campaign is not accepting donations' }, 409);

    const rpcUrl = process.env.SOLANA_RPC_URL;
    if (!rpcUrl) return json(res, { error: 'SOLANA_RPC_URL is not configured' }, 503);
    const transaction = await getTransaction(signature);
    if (transaction.meta?.err) return json(res, { error: 'Solana transaction failed' }, 400);
    if (!await hasMatchingTransfer(transaction, rpcUrl, donorWalletAddress, campaign.creator_wallet_address, amount)) {
      return json(res, { error: 'Transaction does not match the requested USDC donation' }, 400);
    }

    const result = await sql`
      with inserted as (
        insert into donations (transaction_signature, amount, donor_wallet_address, campaign_id, created_at)
        select ${signature}, ${amount.toString()}, ${donorWalletAddress}, ${campaignId}, now()
        where exists (
          select 1 from campaigns
          where id = ${campaignId} and status not in ('funded', 'ended')
        )
        on conflict (transaction_signature) do nothing
        returning transaction_signature
      ), updated as (
        update campaigns
        set total_raised = total_raised + ${amount.toString()},
            donation_count = donation_count + 1,
            status = case when total_raised + ${amount.toString()} >= goal then 'goal_reached' else status end
        where id = ${campaignId} and exists (select 1 from inserted)
        returning id
      )
      select
        (select count(*)::int from inserted) as inserted_count,
        (select count(*)::int from updated) as updated_count
    `;
    if (!result[0]?.inserted_count) return json(res, { error: 'Donation transaction already recorded or campaign is closed' }, 409);
    return json(res, { ok: true }, 201);
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error(error);
    return json(res, { error: 'Internal server error' }, 500);
  }
}
