import { getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { requireWallet } from './_lib/auth.js';
import { getDatabase } from './_lib/db.js';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
const MAX_KORA_FEE_UNITS = BigInt(process.env.KORA_MAX_FEE_USDC_UNITS || '1000000');

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function json(res: any, body: unknown, status = 200) {
  return res.status(status)
    .setHeader('Content-Type', 'application/json')
    .setHeader('X-Content-Type-Options', 'nosniff')
    .json(body);
}

async function koraRpc(method: string, params: Record<string, unknown>) {
  const endpoint = process.env.KORA_RPC_URL;
  if (!endpoint) {
    throw new HttpError(503, 'KORA_RPC_URL is not configured');
  }

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  if (process.env.KORA_API_KEY) {
    headers['x-api-key'] = process.env.KORA_API_KEY;
    headers.authorization = `Bearer ${process.env.KORA_API_KEY}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new HttpError(502, 'Kora RPC request failed');
  }

  const payload = await response.json();
  if (payload.error) {
    const message = typeof payload.error?.message === 'string' ? payload.error.message : 'Kora RPC error';
    throw new HttpError(400, message);
  }

  return payload.result;
}

function decodeTransaction(transaction: string) {
  try {
    return Transaction.from(Buffer.from(transaction, 'base64'));
  } catch {
    throw new HttpError(400, 'Invalid Solana transaction');
  }
}

function instructionAmount(instruction: any) {
  if (instruction.data.length !== 9 || instruction.data[0] !== 3) return null;
  return instruction.data.subarray(1).reduceRight((amount: bigint, byte: number) => (amount << 8n) + BigInt(byte), 0n);
}

function assertDonationTransaction(
  serialized: string,
  donorAddress: string,
  creatorAddress: string,
  payerSignerAddress: string,
  paymentAddress: string,
  totalAmount: bigint,
  requireDonorSignature: boolean,
) {
  const transaction = decodeTransaction(serialized);
  const donor = new PublicKey(donorAddress);
  const creator = new PublicKey(creatorAddress);
  const payerSigner = new PublicKey(payerSignerAddress);
  const paymentOwner = new PublicKey(paymentAddress);
  const creatorTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, creator);
  const paymentTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, paymentOwner);
  const donorSignature = transaction.signatures.find((signature) => signature.publicKey.equals(donor));

  if (!transaction.feePayer?.equals(payerSigner) || (requireDonorSignature && (!donorSignature?.signature || donorSignature.signature.every((byte) => byte === 0))) || transaction.instructions.length < 2 || transaction.instructions.length > 3) {
    throw new HttpError(400, 'Transaction does not match an approved donation');
  }

  let creatorAtaCreated = false;
  let campaignAmount = 0n;
  let feeAmount = 0n;
  for (const instruction of transaction.instructions) {
    if (instruction.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) {
      const keys = instruction.keys;
      if (creatorAtaCreated || keys.length !== 6 || !keys[0].pubkey.equals(donor) || !keys[1].pubkey.equals(creatorTokenAccount) || !keys[2].pubkey.equals(creator) || !keys[3].pubkey.equals(USDC_MINT) || !keys[4].pubkey.equals(SystemProgram.programId) || !keys[5].pubkey.equals(TOKEN_PROGRAM_ID)) {
        throw new HttpError(400, 'Transaction contains an invalid token account creation');
      }
      creatorAtaCreated = true;
      continue;
    }

    const amount = instructionAmount(instruction);
    const keys = instruction.keys;
    if (!instruction.programId.equals(TOKEN_PROGRAM_ID) || amount === null || keys.length !== 3 || !keys[2].pubkey.equals(donor)) {
      throw new HttpError(400, 'Transaction contains an unapproved instruction');
    }
    if (keys[1].pubkey.equals(creatorTokenAccount)) campaignAmount += amount;
    else if (keys[1].pubkey.equals(paymentTokenAccount)) feeAmount += amount;
    else throw new HttpError(400, 'Transaction contains an unapproved recipient');
  }

  const isEstimate = !requireDonorSignature;
  if (campaignAmount <= 0n || campaignAmount + feeAmount !== totalAmount || feeAmount > MAX_KORA_FEE_UNITS || (!isEstimate && feeAmount <= 0n)) {
    throw new HttpError(400, 'Transaction has an invalid donation or network fee');
  }
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const signer = await koraRpc('getPayerSigner', {});
      return json(res, {
        signerAddress: signer.signer_address,
        paymentAddress: signer.payment_address,
      });
    }

    if (req.method !== 'POST') {
      return json(res, { error: 'Method not allowed' }, 405);
    }

    const body = req.body || {};
    const donorWalletAddress = String(body.donorWalletAddress || '');
    const transaction = String(body.transaction || '');
    const campaignId = String(body.campaignId || '');
    const totalAmountValue = String(body.totalAmount || '');
    const totalAmount = /^\d+$/.test(totalAmountValue) ? BigInt(totalAmountValue) : 0n;

    if (!donorWalletAddress || !transaction || !campaignId || totalAmount <= 0n) {
      return json(res, { error: 'Missing donation details' }, 400);
    }

    const userId = await requireWallet(req, donorWalletAddress);
    const sql = getDatabase();
    const campaigns = await sql`select creator_wallet_address, status from campaigns where id = ${campaignId} limit 1`;
    const campaign = campaigns[0];
    if (!campaign || campaign.status === 'funded' || campaign.status === 'ended' || campaign.creator_wallet_address === donorWalletAddress) {
      return json(res, { error: 'Campaign is not accepting this donation' }, 400);
    }
    const signer = await koraRpc('getPayerSigner', {});
    if (typeof signer.signer_address !== 'string' || typeof signer.payment_address !== 'string') {
      throw new HttpError(502, 'Kora returned an invalid payer configuration');
    }
    assertDonationTransaction(transaction, donorWalletAddress, campaign.creator_wallet_address, signer.signer_address, signer.payment_address, totalAmount, body.action !== 'estimate');

    if (body.action === 'estimate') {
      const estimate = await koraRpc('estimateTransactionFee', {
        transaction,
        fee_token: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      });

      if (typeof estimate.fee_in_token !== 'number' || typeof estimate.payment_address !== 'string') {
        throw new HttpError(502, 'Kora returned an invalid fee estimate');
      }

      return json(res, {
        feeInToken: estimate.fee_in_token,
        paymentAddress: estimate.payment_address,
      });
    }

    const relayResult = await koraRpc('signAndSendTransaction', {
      transaction,
      respond_after: 'confirmed',
      user_id: userId,
    });

    return json(res, {
      signature: relayResult.signature,
      signerPubkey: relayResult.signer_pubkey,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      const message = error.status === 401 ? 'Unauthorized' : error.status === 403 ? 'Wallet does not belong to the authenticated user' : 'Request failed';
      return json(res, { error: message }, error.status || 400);
    }
    if (error instanceof HttpError) {
      return json(res, { error: error.message }, error.status);
    }
    console.error('Kora API error:', error);
    return json(res, { error: 'Internal server error' }, 500);
  }
}
