import { PublicKey } from '@solana/web3.js';

// Read from environment variables (set in Vercel dashboard or .env.local)
// Falls back to devnet defaults if not set
// DEBUG must be explicitly set to 'true' to enable, otherwise defaults to false
export const DEBUG = import.meta.env.REACT_APP_DEBUG === 'true';
export const NETWORK = import.meta.env.REACT_APP_NETWORK || 'https://api.devnet.solana.com';
export const PROGRAM_ID = new PublicKey(
  import.meta.env.REACT_APP_PROGRAM_ID || '5ZWLcrXGpKmV7R7u4LpiVKmVcdEYc7trztEQqYYDvXyz'
);
export const PLATFORM_WALLET = import.meta.env.REACT_APP_PLATFORM_WALLET || 'ANaSzJRXdTjCyih1W6Zvf63AXcPSgahS1CpsxX3oo8LR';
export const commitment = 'confirmed';

// Log the DEBUG value in development to help troubleshoot
console.log('[Environment] DEBUG:', DEBUG, '| REACT_APP_DEBUG:', import.meta.env.REACT_APP_DEBUG);