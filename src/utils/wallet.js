import { Transaction } from '@solana/web3.js';

/**
 * Normalizes different wallet adapter behaviors for transaction signing.
 * Some adapters return a signed Transaction, others return just the signature.
 */
export async function normalizeWalletSign(wallet, transaction) {
  if (!wallet?.signTransaction) {
    throw new Error('Wallet must implement signTransaction');
  }

  const signed = await wallet.signTransaction(transaction);

  // Case 1: Wallet returned a fully signed Transaction (most common)
  if (signed instanceof Transaction) {
    return signed;
  }

  // Case 2: Wallet returned signature(s) as Uint8Array or base64
  if (signed instanceof Uint8Array || typeof signed === 'string') {
    transaction.addSignature(wallet.publicKey, signed instanceof Uint8Array ? signed : Buffer.from(signed, 'base64'));
    return transaction;
  }

  // Case 3: Unknown return type
  throw new Error(`Unsupported wallet signature type: ${typeof signed}`);
}

/**
 * Creates a Transaction from an instruction and handles common wallet signing patterns.
 * Returns a signed, serialized transaction ready for sendRawTransaction.
 */
export async function signAndSerializeTransaction({
  instruction,
  feePayer,
  recentBlockhash,
  wallet
}) {
  const tx = new Transaction();
  tx.add(instruction);
  tx.feePayer = feePayer;
  tx.recentBlockhash = recentBlockhash;

  const signedTx = await normalizeWalletSign(wallet, tx);
  return signedTx.serialize();
}