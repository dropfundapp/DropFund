import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useWallets as useSolanaWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import bs58 from 'bs58';

const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://solana-rpc.publicnode.com';
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const USDC_DECIMALS = 6;

export function useSolanaDonation() {
  const { wallets } = useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
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

    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    const transaction = new Transaction({ feePayer: donor, recentBlockhash: blockhash });

    try {
      await getAccount(connection, creatorTokenAccount);
    } catch {
      transaction.add(createAssociatedTokenAccountInstruction(donor, creatorTokenAccount, creator, USDC_MINT));
    }

    transaction.add(createTransferInstruction(donorTokenAccount.pubkey, creatorTokenAccount, donor, donationUnits, [], TOKEN_PROGRAM_ID));

    const result = await signAndSendTransaction({
      transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
      wallet,
      chain: 'solana:mainnet',
      options: { optimisticBroadcast: true },
    });
    const signature = bs58.encode(result.signature);

    return { success: true, signature, amount, fee: 0 };
  };

  return { donate };
}
