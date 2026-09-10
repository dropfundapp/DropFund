import { PublicKey } from '@solana/web3.js';
import { useQuery } from '@tanstack/react-query';
import { usePrivyAuth } from '../components/PrivyAuthProvider';

const SOLANA_RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://solana-rpc.publicnode.com';
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

async function rpcRequest(method: string, params: unknown[]) {
  const payload = { jsonrpc: '2.0', id: Date.now(), method, params };
  const response = await fetch(SOLANA_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Mainnet RPC rejected the request (${response.status}). Configure VITE_SOLANA_RPC_URL with a mainnet RPC provider.`);
  const result = await response.json();
  if (result.error) throw new Error(result.error.message || 'Solana RPC request failed');
  return result.result;
}

export function usePrivyBalances() {
  const { ready: authReady, solanaAddress: address } = usePrivyAuth();

  const balanceQuery = useQuery({
    queryKey: ['privy-balances', address],
    enabled: authReady && !!address,
    queryFn: async () => {
      if (!address) return { sol: 0, usdc: 0, usdcUnits: 0n };
      const owner = new PublicKey(address);
      const lamports = await rpcRequest('getBalance', [owner.toBase58(), { commitment: 'confirmed' }]);
      let usdc = 0;
      let usdcUnits = 0n;
      try {
        const tokenAccounts = await rpcRequest('getTokenAccountsByOwner', [owner.toBase58(), { mint: USDC_MINT.toBase58() }, { encoding: 'jsonParsed', commitment: 'confirmed' }]);
        usdc = (tokenAccounts.value || []).reduce((total: number, account: any) => {
          return total + Number(account.account.data.parsed.info.tokenAmount.uiAmount || 0);
        }, 0);
        usdcUnits = (tokenAccounts.value || []).reduce((total: bigint, account: any) => {
          return total + BigInt(account.account.data.parsed.info.tokenAmount.amount || '0');
        }, 0n);
      } catch (error) {
        console.warn('USDC balance lookup failed; keeping SOL balance:', error);
      }
      return { sol: Number(lamports.value || 0) / 1e9, usdc, usdcUnits };
    },
    staleTime: 5_000,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  return {
    solanaAddress: address,
    usdcBalance: balanceQuery.data?.usdc ?? null,
    usdcBalanceUnits: balanceQuery.data?.usdcUnits ?? null,
    solBalance: balanceQuery.data?.sol ?? null,
    balanceError: balanceQuery.error instanceof Error ? balanceQuery.error.message : (!address ? 'Privy Solana wallet address is not available.' : null),
    isLoading: balanceQuery.isLoading,
    refetch: balanceQuery.refetch,
  };
}