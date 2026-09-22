import { getAssociatedTokenAddressSync, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { requireWallet } from './_lib/auth.js';
import { getDatabase } from './_lib/db.js';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const MINIMUM_DONATION_UNITS = 2_000_000n;
const MINIMUM_FEE_UNITS = 100_000n;
const MAXIMUM_FEE_UNITS = 950_000n;
const REDUCED_RATE_THRESHOLD_UNITS = 190_000_000n;

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

  const apiKey = process.env.KORA_API_KEY;
  if (!apiKey) throw new HttpError(503, 'Kora API authentication is not configured');
  headers['x-api-key'] = apiKey;
  headers.authorization = `Bearer ${apiKey}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });
  } catch (error) {
    console.error('Kora RPC connection failed:', error);
    throw new HttpError(503, 'Kora sponsorship service is unavailable. Please try again shortly.');
  }

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

function calculateDropfundFee(totalAmount: bigint) {
  if (totalAmount < MINIMUM_DONATION_UNITS) {
    throw new HttpError(400, 'The minimum donation is 2 USDC');
  }

  if (totalAmount >= REDUCED_RATE_THRESHOLD_UNITS) {
    return totalAmount / 200n;
  }

  const percentageFee = (totalAmount * 2n) / 100n;
  return percentageFee < MINIMUM_FEE_UNITS
    ? MINIMUM_FEE_UNITS
    : percentageFee > MAXIMUM_FEE_UNITS
      ? MAXIMUM_FEE_UNITS
      : percentageFee;
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

  if (!transaction.feePayer?.equals(payerSigner) || (requireDonorSignature && (!donorSignature?.signature || donorSignature.signature.every((byte) => byte === 0))) || transaction.instructions.length < 2 || transaction.instructions.length > 4) {
    throw new HttpError(400, 'Transaction does not match an approved donation');
  }

  const createdTokenAccounts = new Set<string>();
  let campaignAmount = 0n;
  let feeAmount = 0n;
  for (const instruction of transaction.instructions) {
    if (instruction.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) {
      const keys = instruction.keys;
      const isCreatorAccount = keys[0]?.pubkey.equals(payerSigner) && keys[1]?.pubkey.equals(creatorTokenAccount) && keys[2]?.pubkey.equals(creator);
      const isPaymentAccount = keys[0]?.pubkey.equals(payerSigner) && keys[1]?.pubkey.equals(paymentTokenAccount) && keys[2]?.pubkey.equals(paymentOwner);
      if (keys.length !== 6 || (!isCreatorAccount && !isPaymentAccount) || createdTokenAccounts.has(keys[1].pubkey.toBase58()) || !keys[3].pubkey.equals(USDC_MINT) || !keys[4].pubkey.equals(SystemProgram.programId) || !keys[5].pubkey.equals(TOKEN_PROGRAM_ID)) {
        throw new HttpError(400, 'Transaction contains an invalid token account creation');
      }
      createdTokenAccounts.add(keys[1].pubkey.toBase58());
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

  const expectedFee = calculateDropfundFee(totalAmount);
  if (campaignAmount <= 0n || campaignAmount + feeAmount !== totalAmount || feeAmount !== expectedFee) {
    throw new HttpError(400, 'Transaction has an invalid donation or Dropfund fee');
  }
}

function assertWithdrawalTransaction(
  serialized: string,
  withdrawerAddress: string,
  recipientAddress: string,
  payerSignerAddress: string,
  amount: bigint,
) {
  const transaction = decodeTransaction(serialized);
  const withdrawer = new PublicKey(withdrawerAddress);
  const recipient = new PublicKey(recipientAddress);
  const payerSigner = new PublicKey(payerSignerAddress);
  const sourceTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, withdrawer);
  const destinationTokenAccount = getAssociatedTokenAddressSync(USDC_MINT, recipient);
  const withdrawerSignature = transaction.signatures.find((signature) => signature.publicKey.equals(withdrawer));

  if (withdrawer.equals(recipient) || !transaction.feePayer?.equals(payerSigner) || !withdrawerSignature?.signature || withdrawerSignature.signature.every((byte) => byte === 0) || transaction.instructions.length !== 1) {
    throw new HttpError(400, 'Transaction does not match an approved withdrawal');
  }

  const instruction = transaction.instructions[0];
  const transferAmount = instructionAmount(instruction);
  if (!instruction.programId.equals(TOKEN_PROGRAM_ID) || transferAmount !== amount || instruction.keys.length !== 3 || !instruction.keys[0].pubkey.equals(sourceTokenAccount) || !instruction.keys[1].pubkey.equals(destinationTokenAccount) || !instruction.keys[2].pubkey.equals(withdrawer)) {
    throw new HttpError(400, 'Transaction does not match an approved withdrawal');
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
    if (body.action === 'withdrawal') {
      const withdrawerWalletAddress = String(body.withdrawerWalletAddress || '');
      const recipientWalletAddress = String(body.recipientWalletAddress || '');
      const transaction = String(body.transaction || '');
      const amountValue = String(body.amount || '');
      const amount = /^\d+$/.test(amountValue) ? BigInt(amountValue) : 0n;
      if (!withdrawerWalletAddress || !recipientWalletAddress || !transaction || amount <= 0n) {
        return json(res, { error: 'Missing withdrawal details' }, 400);
      }
      const userId = await requireWallet(req, withdrawerWalletAddress);
      const signer = await koraRpc('getPayerSigner', {});
      if (typeof signer.signer_address !== 'string') throw new HttpError(502, 'Kora returned an invalid payer configuration');
      assertWithdrawalTransaction(transaction, withdrawerWalletAddress, recipientWalletAddress, signer.signer_address, amount);
      const relayResult = await koraRpc('signAndSendTransaction', { transaction, respond_after: 'sent', user_id: userId });
      return json(res, { signature: relayResult.signature, signerPubkey: relayResult.signer_pubkey });
    }
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
      return json(res, {
        feeInToken: Number(calculateDropfundFee(totalAmount)),
        paymentAddress: signer.payment_address,
      });
    }

    const relayResult = await koraRpc('signAndSendTransaction', {
      transaction,
      respond_after: 'sent',
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
