import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useWallets as useSolanaWallets, useSignAndSendTransaction, useSignTransaction } from '@privy-io/react-auth/solana';
import bs58 from 'bs58';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrivyAuth } from '@/components/PrivyAuthProvider';

const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://solana-rpc.publicnode.com';
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const USDC_DECIMALS = 6;
const USE_KORA = import.meta.env.VITE_USE_KORA === 'true';
const USER_PAYS_KORA_FEE = import.meta.env.VITE_KORA_USER_PAYS_USDC === 'true';
type DonationPhase = 'idle' | 'preparing' | 'awaiting_signature' | 'submitting';

export interface DonationFeeQuote {
  total: number;
  campaignAmount: number;
  fee: number;
}

interface PreparedDonation {
  walletAddress: string;
  creatorWallet: string;
  totalUnits: bigint;
  transaction: Transaction;
  feeInToken: bigint;
  preparedAt: number;
}

interface KoraPayer {
  signerAddress: string;
  paymentAddress: string;
}

let koraPayer: KoraPayer | null = null;
let koraPayerRequest: Promise<KoraPayer> | null = null;
let preparedDonation: PreparedDonation | null = null;
const PREPARED_DONATION_TTL_MS = 45_000;

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function getKoraPayer() {
  if (koraPayer) return koraPayer;
  if (koraPayerRequest) return koraPayerRequest;

  koraPayerRequest = (async () => {
  const response = await fetch('/api/kora');
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body?.signerAddress !== 'string' || typeof body?.paymentAddress !== 'string') {
    throw new Error(body?.error || 'Failed to fetch Kora signer address');
  }
    koraPayer = { signerAddress: body.signerAddress, paymentAddress: body.paymentAddress };
    return koraPayer;
  })();

  try {
    return await koraPayerRequest;
  } finally {
    koraPayerRequest = null;
  }
}

async function getKoraFeeEstimate(donorWalletAddress: string, campaignId: string, totalAmount: bigint, transaction: Transaction, getAccessToken: () => Promise<string | null>) {
  const token = await getAccessToken();
  if (!token) throw new Error('Authentication required');

  const response = await fetch('/api/kora', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: 'estimate',
      donorWalletAddress,
      campaignId,
      totalAmount: totalAmount.toString(),
      transaction: bytesToBase64(transaction.serialize({ requireAllSignatures: false, verifySignatures: false })),
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !Number.isSafeInteger(body?.feeInToken) || body.feeInToken < 1 || typeof body?.paymentAddress !== 'string') {
    throw new Error(body?.error || 'Failed to estimate the USDC network fee');
  }

  return { feeInToken: BigInt(body.feeInToken), paymentAddress: body.paymentAddress };
}

export function useSolanaDonation() {
  const { wallets } = useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { signTransaction } = useSignTransaction();
  const { getAccessToken } = usePrivyAuth();
  const wallet = wallets[0] as any;
  const [donationPhase, setDonationPhase] = useState<DonationPhase>('idle');
  const prefetchedWalletAddress = useRef<string | null>(null);

  const prepareKoraDonation = useCallback(async (campaignId: string, amount: number, creatorWallet: string) => {
    if (!wallet?.address) throw new Error('Your embedded Solana wallet is not ready. Please sign in again.');
    const totalUnits = BigInt(Math.floor(amount * 10 ** USDC_DECIMALS));
    const cached = preparedDonation;
    if (cached && cached.walletAddress === wallet.address && cached.creatorWallet === creatorWallet && cached.totalUnits === totalUnits && Date.now() - cached.preparedAt < PREPARED_DONATION_TTL_MS) {
      return cached;
    }

    const donor = new PublicKey(wallet.address);
    const creator = new PublicKey(creatorWallet);
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const creatorTokenAccount = await getAssociatedTokenAddress(USDC_MINT, creator);
    const donorTokenAccounts = await connection.getParsedTokenAccountsByOwner(donor, { mint: USDC_MINT });
    const donorTokenAccount = donorTokenAccounts.value.find((account) => BigInt(account.account.data.parsed.info.tokenAmount.amount) >= totalUnits);
    if (!donorTokenAccount) throw new Error('Insufficient USDC balance.');

    const payer = await getKoraPayer();
    const paymentTokenAccount = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(payer.paymentAddress));
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction({ feePayer: new PublicKey(payer.signerAddress), recentBlockhash: blockhash });
    try {
      await getAccount(connection, creatorTokenAccount);
    } catch {
      transaction.add(createAssociatedTokenAccountInstruction(donor, creatorTokenAccount, creator, USDC_MINT));
    }
    transaction.add(createTransferInstruction(donorTokenAccount.pubkey, creatorTokenAccount, donor, totalUnits, [], TOKEN_PROGRAM_ID));
    transaction.add(createTransferInstruction(donorTokenAccount.pubkey, paymentTokenAccount, donor, 0n, [], TOKEN_PROGRAM_ID));
    const { feeInToken } = await getKoraFeeEstimate(donor.toBase58(), campaignId, totalUnits, transaction, getAccessToken);
    if (feeInToken >= totalUnits) throw new Error('Donation amount is too small to cover the network fee.');
    transaction.instructions[transaction.instructions.length - 2] = createTransferInstruction(donorTokenAccount.pubkey, creatorTokenAccount, donor, totalUnits - feeInToken, [], TOKEN_PROGRAM_ID);
    transaction.instructions[transaction.instructions.length - 1] = createTransferInstruction(donorTokenAccount.pubkey, paymentTokenAccount, donor, feeInToken, [], TOKEN_PROGRAM_ID);
    const prepared = { walletAddress: wallet.address, creatorWallet, totalUnits, transaction, feeInToken, preparedAt: Date.now() };
    preparedDonation = prepared;
    return prepared;
  }, [getAccessToken, wallet?.address]);

  useEffect(() => {
    if (!USE_KORA || !wallet?.address || prefetchedWalletAddress.current === wallet.address) return;

    prefetchedWalletAddress.current = wallet.address;
    void getKoraPayer().catch(() => {
      prefetchedWalletAddress.current = null;
    });
  }, [wallet?.address]);

  const estimateFee = useCallback(async (amount: number, creatorWallet: string, campaignId = '') => {
    if (!USER_PAYS_KORA_FEE || !wallet?.address || !Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    if (!campaignId) return null;
    const prepared = await prepareKoraDonation(campaignId, amount, creatorWallet);
    return Number(prepared.feeInToken) / 10 ** USDC_DECIMALS;
  }, [prepareKoraDonation, wallet?.address]);

  const donate = async (
    _campaignId: string,
    amount: number,
    creatorWallet: string,
    confirmFeeQuote?: (quote: DonationFeeQuote) => Promise<boolean>,
  ) => {
    if (!wallet?.address) {
      throw new Error('Your embedded Solana wallet is not ready. Please sign in again.');
    }

    setDonationPhase('preparing');
    try {
      const donor = new PublicKey(wallet.address);
      const totalUnits = BigInt(Math.floor(amount * 10 ** USDC_DECIMALS));
      let transaction: Transaction;

      let signature = '';
      let fee = 0;

      if (USE_KORA) {
        if (USER_PAYS_KORA_FEE) {
          const prepared = await prepareKoraDonation(_campaignId, amount, creatorWallet);
          transaction = prepared.transaction;
          fee = Number(prepared.feeInToken) / 10 ** USDC_DECIMALS;
          const confirmed = await confirmFeeQuote?.({
            total: amount,
            campaignAmount: amount - fee,
            fee,
          }) ?? true;
          if (!confirmed) throw new Error('User cancelled');
          preparedDonation = null;
        } else {
          throw new Error('Kora donations require a USDC fee configuration.');
        }

        setDonationPhase('awaiting_signature');
        const signed = await signTransaction({
          transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
          wallet,
          chain: 'solana:mainnet',
          options: { uiOptions: { showWalletUIs: false } },
        });
        const token = await getAccessToken();
        if (!token) throw new Error('Authentication required');

        setDonationPhase('submitting');
        const relayResponse = await fetch('/api/kora', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            donorWalletAddress: donor.toBase58(),
            campaignId: _campaignId,
            totalAmount: totalUnits.toString(),
            transaction: bytesToBase64(signed.signedTransaction),
          }),
        });
        const relayBody = await relayResponse.json().catch(() => ({}));
        if (!relayResponse.ok || typeof relayBody?.signature !== 'string') {
          throw new Error(relayBody?.error || 'Kora relay rejected the transaction');
        }
        signature = relayBody.signature;
      } else {
        const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
        const creator = new PublicKey(creatorWallet);
        const creatorTokenAccount = await getAssociatedTokenAddress(USDC_MINT, creator);
        const donorTokenAccounts = await connection.getParsedTokenAccountsByOwner(donor, { mint: USDC_MINT });
        const donorTokenAccount = donorTokenAccounts.value.find((account) => BigInt(account.account.data.parsed.info.tokenAmount.amount) >= totalUnits);
        if (!donorTokenAccount) throw new Error('Insufficient USDC balance.');
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction = new Transaction({ feePayer: donor, recentBlockhash: blockhash });
        try {
          await getAccount(connection, creatorTokenAccount);
        } catch {
          transaction.add(createAssociatedTokenAccountInstruction(donor, creatorTokenAccount, creator, USDC_MINT));
        }
        transaction.add(createTransferInstruction(donorTokenAccount.pubkey, creatorTokenAccount, donor, totalUnits, [], TOKEN_PROGRAM_ID));
        const result = await signAndSendTransaction({
          transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
          wallet,
          chain: 'solana:mainnet',
          options: { optimisticBroadcast: true },
        });
        signature = bs58.encode(result.signature);
      }

      return { success: true, signature, amount: amount - fee, fee };
    } finally {
      setDonationPhase('idle');
    }
  };

  return { donate, estimateFee, donationPhase };
}
