import { web3 } from "@coral-xyz/anchor";
import { Buffer } from "buffer";

/**
 * Creates a donation instruction manually encoded from IDL
 */
export function createDonateInstruction({
  amount,
  donor,
  creator,
  platform,
  programId,
  idl,
}) {
  // Find donate instruction definition in IDL
  const donateIxDef = idl.instructions.find(ix => ix.name === 'donate');
  if (!donateIxDef || !donateIxDef.discriminator) {
    throw new Error('Could not find donate instruction discriminator in IDL');
  }

  // Get discriminator and encode amount
  const discriminator = Buffer.from(donateIxDef.discriminator);
  const amountBuf = (amount && amount.toArrayLike)
    ? Buffer.from(amount.toArrayLike(Buffer, 'le', 8))
    : Buffer.alloc(8);

  // Combine discriminator and data
  const data = Buffer.concat([discriminator, amountBuf]);

  // Define account metas
  const keys = [
    { pubkey: donor, isSigner: true, isWritable: true },
    { pubkey: creator, isSigner: false, isWritable: true },
    { pubkey: platform, isSigner: false, isWritable: true },
    { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  // Return constructed instruction
  return new web3.TransactionInstruction({
    keys,
    programId,
    data,
  });
}

/**
 * Manually creates and sends a donation transaction to avoid Anchor provider validation.
 * Returns the transaction signature.
 */
export async function sendDonationTransaction({
  amount,
  donor,
  creator,
  platform,
  programId,
  idl,
  connection,
  wallet,
}) {
  // Create the instruction with manual encoding
  const ix = createDonateInstruction({
    amount,
    donor,
    creator,
    platform,
    programId,
    idl,
  });

  // Build and prepare transaction
  const tx = new web3.Transaction().add(ix);
  tx.feePayer = donor;
  
  const latest = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = latest.blockhash;

  // Sign and send
  const signedTx = await wallet.signTransaction(tx);
  const raw = signedTx.serialize();
  
  const txSig = await connection.sendRawTransaction(raw, { skipPreflight: false });
  await connection.confirmTransaction(txSig, "confirmed");
  
  return txSig;
}