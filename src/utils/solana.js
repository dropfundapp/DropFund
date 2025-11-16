// ---------------------------
// ⚙️ Transaction Helpers
// ---------------------------

/**
 * Creates a TransactionInstruction for the donate instruction
 * using manual encoding to avoid Anchor provider validation.
 */
function createDonateInstruction({
  amount,
  donor,
  creator,
  platform,
  programId,
  idl,
}) {
  // Find instruction definition and discriminator
  const donateIxDef = idl.instructions.find(ix => ix.name === 'donate');
  if (!donateIxDef?.discriminator) {
    throw new Error('Could not find donate instruction discriminator in IDL');
  }

  // Encode instruction data: discriminator + amount (u64 LE)
  const discriminator = Buffer.from(donateIxDef.discriminator);
  const amountBuf = Buffer.from(amount.toArrayLike(Buffer, 'le', 8));
  const data = Buffer.concat([discriminator, amountBuf]);

  // Build account metas in order matching IDL
  const keys = [
    { pubkey: donor, isSigner: true, isWritable: true },
    { pubkey: creator, isSigner: false, isWritable: true },
    { pubkey: platform, isSigner: false, isWritable: true },
    { pubkey: web3.SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  return new web3.TransactionInstruction({ keys, programId, data });
}