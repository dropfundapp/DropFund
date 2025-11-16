
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { DevappProvider } from "@devfunlabs/web-sdk";
import "./index.css";

// Solana Wallet Adapter imports
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';

// Import the wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Define a root functional component for your application
function Root() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  const phantom = useMemo(() => new PhantomWalletAdapter(), []);

  // Initialize wallets array with just Phantom
  const wallets = useMemo(
    () => [phantom],
    [phantom]
  );

  return (
    <React.StrictMode>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets}>
          <WalletModalProvider>
            <DevappProvider
              rpcEndpoint="https://api.devnet.solana.com"
              devbaseEndpoint="https://devbase.dev.fun"
              appId="38814e870dd403686aba"
            >
              <App />
            </DevappProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </React.StrictMode>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);


