import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { defaultSolanaRpcsPlugin } from '@privy-io/react-auth/solana';
import { createContext, useContext, type ReactNode } from 'react';

interface PrivyAuthState {
  ready: boolean;
  authenticated: boolean;
  configured: boolean;
  login: () => void;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  hasEmbeddedSolanaWallet: boolean;
  solanaAddress: string | null;
}

const PrivyAuthContext = createContext<PrivyAuthState>({
  ready: true,
  authenticated: false,
  configured: false,
  login: () => undefined,
  logout: async () => undefined,
  getAccessToken: async () => null,
  hasEmbeddedSolanaWallet: false,
  solanaAddress: null,
});

function PrivyAuthBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout, getAccessToken, user } = usePrivy();
  const { wallets } = useWallets();
  const solanaWallet = wallets.find((wallet) => (wallet as any).type === 'solana' && ['privy', 'privy-v2'].includes((wallet as any).walletClientType))
    || wallets.find((wallet) => (wallet as any).type === 'solana');
  const linkedSolana = user?.linkedAccounts.find((account) => account.type === 'wallet' && account.chainType === 'solana' && ['privy', 'privy-v2'].includes((account as any).walletClientType)) as { address?: string } | undefined
    || user?.linkedAccounts.find((account) => account.type === 'wallet' && account.chainType === 'solana') as { address?: string } | undefined;
  const solanaAddress = solanaWallet?.address || linkedSolana?.address || null;

  return (
    <PrivyAuthContext.Provider value={{ ready, authenticated, configured: true, login, logout, getAccessToken, hasEmbeddedSolanaWallet: !!solanaAddress, solanaAddress }}>
      {children}
    </PrivyAuthContext.Provider>
  );
}

export function usePrivyAuth() {
  return useContext(PrivyAuthContext);
}

export function PrivyAuthProvider({ children }: { children: ReactNode }) {
  const appId = import.meta.env.VITE_PRIVY_APP_ID;

  if (!appId) {
    return <PrivyAuthContext.Provider value={{ ready: true, authenticated: false, configured: false, login: () => undefined, logout: async () => undefined, getAccessToken: async () => null, hasEmbeddedSolanaWallet: false, solanaAddress: null }}>{children}</PrivyAuthContext.Provider>;
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        plugins: [defaultSolanaRpcsPlugin()],
        loginMethods: ['google', 'apple'],
        embeddedWallets: {
          solana: {
            createOnLogin: 'all-users',
          },
        },
        appearance: {
          walletChainType: 'solana-only',
          theme: '#131313',
          accentColor: '#4b54ff',
          landingHeader: 'Welcome to Dropfund',
          loginMessage: 'Sign in to create campaigns and support causes on chain.',
        },
      }}
    >
      <PrivyAuthBridge>{children}</PrivyAuthBridge>
    </PrivyProvider>
  );
}