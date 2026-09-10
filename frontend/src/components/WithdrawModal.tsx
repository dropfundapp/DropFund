import { ArrowLeft, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWallets as useSolanaWallets, useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import bs58 from 'bs58';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { usePrivyAuth } from './PrivyAuthProvider';

interface WithdrawModalProps {
  open: boolean;
  balance: number | null;
  onOpenChange: (open: boolean) => void;
}

export default function WithdrawModal({ open, balance, onOpenChange }: WithdrawModalProps) {
  const feeReserve = 0;
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [step, setStep] = useState<'amount' | 'destination'>('amount');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { wallets } = useSolanaWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const { solanaAddress } = usePrivyAuth();
  const queryClient = useQueryClient();
  const wallet = wallets.find((candidate) => {
    const item = candidate as any;
    return item.type === 'solana' || item.chainType === 'solana';
  }) || (wallets.length === 1 ? wallets[0] : undefined) as any;

  useEffect(() => {
    if (!open) {
      setAmount('');
      setDestination('');
      setStep('amount');
      setIsSending(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const numericAmount = Number(amount);
  const spendableBalance = balance === null ? 0 : Math.max(0, balance - feeReserve);
  const canContinue = balance !== null && numericAmount > 0 && numericAmount <= balance && !isSending;
  const destinationError = step === 'destination' && destination.trim() ? (() => {
    try {
      new PublicKey(destination.trim());
      return null;
    } catch {
      return 'Enter a valid Solana wallet address.';
    }
  })() : null;

  const setPercentage = (percentage: number) => {
    if (balance !== null) setAmount((spendableBalance * percentage).toFixed(6));
  };

  const handleWithdraw = async () => {
    if (step === 'amount') {
      setStep('destination');
      return;
    }
    setError(null);
    if (!destination.trim()) {
      setError('Enter the external Solana wallet address.');
      return;
    }
    if (balance !== null && numericAmount > spendableBalance) {
      setError('Withdrawal amount exceeds your USDC balance.');
      return;
    }
    try {
      const recipient = new PublicKey(destination.trim());
      if (!wallet || !(wallet.address || solanaAddress)) {
        const walletSummary = wallets.map((item: any) => `${item.type || item.chainType || 'unknown'}:${item.address?.slice(0, 6) || 'no-address'}`).join(', ');
        throw new Error(`Embedded Solana wallet is not ready. Privy wallets available: ${wallets.length} (${walletSummary || 'none'}).`);
      }
      const senderAddress = wallet.address || solanaAddress;
      if (!senderAddress) throw new Error('Privy Solana wallet address is not ready. Please wait and try again.');

      const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL || 'https://solana-rpc.publicnode.com', 'confirmed');
      const mint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      const owner = new PublicKey(senderAddress);
      const sourceAccounts = await connection.getParsedTokenAccountsByOwner(owner, { mint });
      const sourceAccount = sourceAccounts.value.find((account) => Number(account.account.data.parsed.info.tokenAmount.uiAmount || 0) >= numericAmount);
      if (!sourceAccount) throw new Error('No USDC token account has enough funds.');
      const source = sourceAccount.pubkey;
      const destinationTokenAccount = await getAssociatedTokenAddress(mint, recipient);
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      const transaction = new Transaction({
        feePayer: owner,
        recentBlockhash: blockhash,
      });
      try {
        await getAccount(connection, destinationTokenAccount);
      } catch {
        transaction.add(createAssociatedTokenAccountInstruction(owner, destinationTokenAccount, recipient, mint));
      }
      transaction.add(createTransferInstruction(source, destinationTokenAccount, owner, Math.floor(numericAmount * 1e6), [], TOKEN_PROGRAM_ID));

      setIsSending(true);
      onOpenChange(false);
      const result = await signAndSendTransaction({
        transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }),
        wallet,
        chain: 'solana:mainnet',
        options: { optimisticBroadcast: true },
      });
      const signature = bs58.encode(result.signature);
      await queryClient.invalidateQueries({ queryKey: ['privy-balances'] });
      toast.success('USDC withdrawal complete');
      setAmount('');
      setDestination('');
      onOpenChange(false);
    } catch (withdrawError) {
      const message = withdrawError instanceof Error ? withdrawError.message : 'Withdrawal failed.';
      const displayError = message.toLowerCase().includes('failed to connect to wallet')
        ? null
        : message.includes('Invalid public key')
          ? 'Enter a valid Solana wallet address.'
          : message;
      setError(displayError);
      toast.error('Withdrawal failed', { description: message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10002] flex min-h-full items-center justify-center overflow-y-auto p-3 backdrop-blur-[3px] sm:p-6" onClick={() => onOpenChange(false)}>
      <div className="relative w-full max-w-[440px] rounded-[24px] border border-[#282b30] bg-[#1d1e1f] p-5 text-white shadow-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Back" className="h-8 w-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white" onClick={() => step === 'destination' ? setStep('amount') : onOpenChange(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold tracking-tight">Withdraw to crypto wallet</h2>
          <Button variant="ghost" size="icon" aria-label="Close withdrawal dialog" className="h-8 w-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white" onClick={() => onOpenChange(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative rounded-[22px] bg-[#282b30] px-5 py-6">
          <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-4xl leading-none text-white/45">$</span>
          <Input
            autoFocus
            inputMode="decimal"
            type="text"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
            aria-label="Withdrawal amount"
            className="h-12 border-0 bg-transparent pl-8 !text-4xl font-semibold text-white placeholder:text-white/45 focus-visible:ring-0"
          />
          <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-sm font-medium text-white/35">Enter USDC amount</span>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {[10, 25, 50].map((percentage) => (
            <Button key={percentage} type="button" variant="secondary" className="h-14 bg-[#131313] text-base font-semibold text-white hover:bg-[#282b30]" onClick={() => setPercentage(percentage / 100)}>
              {percentage}%
            </Button>
          ))}
          <Button type="button" variant="secondary" className="h-14 bg-[#131313] text-base font-semibold text-white hover:bg-[#282b30]" onClick={() => setPercentage(1)}>
            Max
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-between px-1 text-base text-white/60">
          <span>Available balance</span>
          <span className="font-medium text-white">{balance === null ? 'Unavailable' : `${spendableBalance.toFixed(2)} USDC`}</span>
        </div>

        {step === 'destination' ? <div className="mt-5 space-y-2">
          <label htmlFor="withdraw-destination" className="text-sm text-white/60">Destination wallet</label>
          <Input id="withdraw-destination" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Paste Solana address" aria-invalid={!!destinationError} className="border-[#282b30] bg-[#282b30] text-white placeholder:text-white/35 focus-visible:ring-0 aria-[invalid=true]:border-[#ff641f]" />
          {destinationError ? <p className="text-sm text-[#ff641f]">{destinationError}</p> : null}
          <p className="text-[11px] leading-4 text-white/40">Send USDC only to a Solana address. Transactions cannot be reversed.</p>
        </div> : null}

        {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

        <Button type="button" disabled={!canContinue || (step === 'destination' && (!destination.trim() || !!destinationError))} onClick={handleWithdraw} className="mt-8 h-14 w-full rounded-2xl bg-[#4b54ff] text-lg font-semibold text-white hover:bg-[#4149e6] disabled:cursor-not-allowed disabled:bg-[#282b30] disabled:opacity-60">
          {isSending ? 'Sending...' : step === 'amount' ? 'Continue' : 'Send USDC'}
        </Button>
      </div>
    </div>
  );
}
