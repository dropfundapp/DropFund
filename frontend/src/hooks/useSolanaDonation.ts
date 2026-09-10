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

let koraSignerAddress: string | null = null;
let koraSignerRequest: Promise<string> | null = null;

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function getKoraSignerAddress() {
  if (koraSignerAddress) return koraSignerAddress;
  if (koraSignerRequest) return koraSignerRequest;

  koraSignerRequest = (async () => {
  const response = await fetch('/api/kora');
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body?.signerAddress !== 'string') {
    throw new Error(body?.error || 'Failed to fetch Kora signer address');
  }
    koraSignerAddress = body.signerAddress;
    return koraSignerAddress;
  })();

  try {
    return await koraSignerRequest;
  } finally {
    koraSignerRequest = null;
  }
}

async function getKoraFeeEstimate(donorWalletAddress: string, transaction: Transaction, getAccessToken: () => Promise<string | null>) {
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
      transaction: bytesToBase64(transaction.serialize({ requireAllSignatures: false, verifySignatures: false })),
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !Number.isSafeInteger(body?.feeInToken) || body.feeInToken < 1 || typeof body?.paymentAddress !== 'string') {
    throw new Error(body?.error || 'Failed to estimate the USDC network fee');
  }

  return { feeInToken: BigInt(body.feeInToken), paymentAddress: body.paymentAddress };
}

function getUsdcSourceAccounts(tokenAccounts: any[]) {
  return tokenAccounts
    .map((account) => ({
      account,
      amount: BigInt(account.account.data.parsed.info.tokenAmount.amount),
    }))
    .filter(({ amount }) => amount > 0n)
    .sort((left, right) => (left.amount > right.amount ? -1 : left.amount < right.amount ? 1 : 0));
}

function formatUsdcUnits(amount: bigint) {
  return (Number(amount) / 10 ** USDC_DECIMALS).toFixed(6);
}

function addSplitTransfers(
  transaction: Transaction,
  sources: ReturnType<typeof getUsdcSourceAccounts>,
  donor: PublicKey,
  destination: PublicKey,
  amount: bigint,
) {
  let remaining = amount;
  for (const source of sources) {
    if (remaining === 0n) break;
    const transferAmount = source.amount < remaining ? source.amount : remaining;
    if (transferAmount === 0n) continue;
    transaction.add(createTransferInstruction(source.account.pubkey, destination, donor, transferAmount, [], TOKEN_PROGRAM_ID));
    source.amount -= transferAmount;
    remaining -= transferAmount;
  }
  if (remaining > 0n) throw new Error('Insufficient USDC balance.');
}

export function useSolanaDonation() {
  const { wallets } = useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { signTransaction } = useSignTransaction();
  const { getAccessToken } = usePrivyAuth();
  const wallet = wallets[0] as any;
  const [donationPhase, setDonationPhase] = useState<DonationPhase>('idle');
  const prefetchedWalletAddress = useRef<string | null>(null);

  useEffect(() => {
    if (!USE_KORA || !wallet?.address || prefetchedWalletAddress.current === wallet.address) return;

    prefetchedWalletAddress.current = wallet.address;
    void getKoraSignerAddress().catch(() => {
      prefetchedWalletAddress.current = null;
    });
  }, [wallet?.address]);

  const estimateFee = useCallback(async (amount: number, creatorWallet: string) => {
    if (!USER_PAYS_KORA_FEE || !wallet?.address || !Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    const donor = new PublicKey(wallet.address);
    const creator = new PublicKey(creatorWallet);
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const totalUnits = BigInt(Math.floor(amount * 10 ** USDC_DECIMALS));
    if (totalUnits < 1n) return null;
    const creatorTokenAccount = await getAssociatedTokenAddress(USDC_MINT, creator);
    const donorTokenAccounts = await connection.getParsedTokenAccountsByOwner(donor, { mint: USDC_MINT });
    const donorTokenAccount = donorTokenAccounts.value.find((account) => BigInt(account.account.data.parsed.info.tokenAmount.amount) > 0n);
    if (!donorTokenAccount) throw new Error('Insufficient USDC balance.');

    const paymentAddress = await getKoraSignerAddress();
    const paymentTokenAccount = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(paymentAddress));
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction({ feePayer: new PublicKey(paymentAddress), recentBlockhash: blockhash });

    try {
      await getAccount(connection, creatorTokenAccount);
    } catch {
      transaction.add(createAssociatedTokenAccountInstruction(donor, creatorTokenAccount, creator, USDC_MINT));
    }

    transaction.add(createTransferInstruction(donorTokenAccount.pubkey, creatorTokenAccount, donor, 1n, [], TOKEN_PROGRAM_ID));
    transaction.add(createTransferInstruction(donorTokenAccount.pubkey, paymentTokenAccount, donor, 0n, [], TOKEN_PROGRAM_ID));
    const { feeInToken } = await getKoraFeeEstimate(donor.toBase58(), transaction, getAccessToken);
    return Number(feeInToken) / 10 ** USDC_DECIMALS;
  }, [getAccessToken, wallet?.address]);

  const donate = async (
    _campaignId: string,
    amount: number,
    creatorWallet: string,
  ) => {
    if (!wallet?.address) {
      throw new Error('Your embedded Solana wallet is not ready. Please sign in again.');
    }

    setDonationPhase('preparing');
    try {
      const donor = new PublicKey(wallet.address);
      const creator = new PublicKey(creatorWallet);
      const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
      const totalUnits = BigInt(Math.floor(amount * 10 ** USDC_DECIMALS));
      const creatorTokenAccount = await getAssociatedTokenAddress(USDC_MINT, creator);
      const donorTokenAccounts = await connection.getParsedTokenAccountsByOwner(donor, { mint: USDC_MINT });
      const donorTokenAccount = donorTokenAccounts.value.find((account) => BigInt(account.account.data.parsed.info.tokenAmount.amount) > 0n);
      if (!donorTokenAccount) throw new Error('Insufficient USDC balance.');
      const availableUnits = donorTokenAccounts.value.reduce(
        (total, account) => total + BigInt(account.account.data.parsed.info.tokenAmount.amount || '0'),
        0n,
      );
      if (availableUnits < totalUnits) {
        throw new Error(`Insufficient USDC balance. Available: ${formatUsdcUnits(availableUnits)} USDC.`);
      }

      const feePayerAddress = USE_KORA ? await getKoraSignerAddress() : donor.toBase58();
      const feePayer = new PublicKey(feePayerAddress);
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      const transaction = new Transaction({ feePayer, recentBlockhash: blockhash });

      try {
        await getAccount(connection, creatorTokenAccount);
      } catch {
        transaction.add(createAssociatedTokenAccountInstruction(donor, creatorTokenAccount, creator, USDC_MINT));
      }

      let signature = '';
      let fee = 0;

      if (USE_KORA) {
        if (USER_PAYS_KORA_FEE) {
          const paymentAddress = await getKoraSignerAddress();
          const paymentTokenAccount = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(paymentAddress));
          const placeholderPaymentInstruction = createTransferInstruction(donorTokenAccount.pubkey, paymentTokenAccount, donor, 0n, [], TOKEN_PROGRAM_ID);
          transaction.add(createTransferInstruction(donorTokenAccount.pubkey, creatorTokenAccount, donor, 1n, [], TOKEN_PROGRAM_ID));
          transaction.add(placeholderPaymentInstruction);

          const { feeInToken } = await getKoraFeeEstimate(donor.toBase58(), transaction, getAccessToken);
          if (feeInToken >= totalUnits) {
            throw new Error('Donation amount is too small to cover the network fee.');
          }
          const donationUnits = totalUnits - feeInToken;
          transaction.instructions.splice(-2, 2);
          const sources = getUsdcSourceAccounts(donorTokenAccounts.value);
          addSplitTransfers(transaction, sources, donor, creatorTokenAccount, donationUnits);
          addSplitTransfers(transaction, sources, donor, paymentTokenAccount, feeInToken);
          fee = Number(feeInToken) / 10 ** USDC_DECIMALS;
        } else {
          addSplitTransfers(transaction, getUsdcSourceAccounts(donorTokenAccounts.value), donor, creatorTokenAccount, totalUnits);
        }

        setDonationPhase('awaiting_signature');
        const signed = await signTransaction({
          transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
          wallet,
          chain: 'solana:mainnet',
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
            transaction: bytesToBase64(signed.signedTransaction),
          }),
        });
        const relayBody = await relayResponse.json().catch(() => ({}));
        if (!relayResponse.ok || typeof relayBody?.signature !== 'string') {
          throw new Error(relayBody?.error || 'Kora relay rejected the transaction');
        }
        signature = relayBody.signature;
      } else {
        addSplitTransfers(transaction, getUsdcSourceAccounts(donorTokenAccounts.value), donor, creatorTokenAccount, totalUnits);
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
