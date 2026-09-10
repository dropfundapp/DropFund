import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useWallets as useSolanaWallets, useSignAndSendTransaction, useSignTransaction } from '@privy-io/react-auth/solana';
import bs58 from 'bs58';
import { usePrivyAuth } from '@/components/PrivyAuthProvider';

const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://solana-rpc.publicnode.com';
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const USDC_DECIMALS = 6;
const USE_KORA = import.meta.env.VITE_USE_KORA === 'true';

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function getKoraSignerAddress() {
  const response = await fetch('/api/kora');
  const body = await response.json().catch(() => ({}));
  if (!response.ok || typeof body?.signerAddress !== 'string') {
    throw new Error(body?.error || 'Failed to fetch Kora signer address');
  }
  return body.signerAddress;
}

export function useSolanaDonation() {
  const { wallets } = useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { signTransaction } = useSignTransaction();
  const { getAccessToken } = usePrivyAuth();
  const wallet = wallets[0] as any;

  const donate = async (_campaignId: string, amount: number, creatorWallet: string) => {
    if (!wallet?.address) {
      throw new Error('Your embedded Solana wallet is not ready. Please sign in again.');
    }

    const donor = new PublicKey(wallet.address);
    const creator = new PublicKey(creatorWallet);
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const donationUnits = BigInt(Math.floor(amount * 10 ** USDC_DECIMALS));
    const creatorTokenAccount = await getAssociatedTokenAddress(USDC_MINT, creator);
    const donorTokenAccounts = await connection.getParsedTokenAccountsByOwner(donor, { mint: USDC_MINT });
    const donorTokenAccount = donorTokenAccounts.value.find((account) => BigInt(account.account.data.parsed.info.tokenAmount.amount) >= donationUnits);
    if (!donorTokenAccount) throw new Error('Insufficient USDC balance.');

    const feePayerAddress = USE_KORA ? await getKoraSignerAddress() : donor.toBase58();
    const feePayer = new PublicKey(feePayerAddress);
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction({ feePayer, recentBlockhash: blockhash });

    try {
      await getAccount(connection, creatorTokenAccount);
    } catch {
      transaction.add(createAssociatedTokenAccountInstruction(donor, creatorTokenAccount, creator, USDC_MINT));
    }

    transaction.add(createTransferInstruction(donorTokenAccount.pubkey, creatorTokenAccount, donor, donationUnits, [], TOKEN_PROGRAM_ID));

    let signature = '';

    if (USE_KORA) {
      const signed = await signTransaction({
        transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
        wallet,
        chain: 'solana:mainnet',
      });
      const token = await getAccessToken();
      if (!token) throw new Error('Authentication required');

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
      const result = await signAndSendTransaction({
        transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
        wallet,
        chain: 'solana:mainnet',
        options: { optimisticBroadcast: true },
      });
      signature = bs58.encode(result.signature);
    }

    return { success: true, signature, amount, fee: 0 };
  };

  return { donate };
}
