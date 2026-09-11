function fallbackDisplayName(walletAddress: string) {
  const adjectives = ['Cosmic', 'Tiny', 'Lucky', 'Chaotic', 'Turbo', 'Sneaky', 'Mighty', 'Bouncy'];
  const nouns = ['Byte', 'Pickle', 'Wizard', 'Noodle', 'Rocket', 'Mango', 'Legend', 'Comet'];
  const seed = walletAddress.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
  return `${adjectives[seed % adjectives.length]} ${nouns[(seed * 7) % nouns.length]}`;
}

export async function ensureUser(sql: any, privyDid: string, walletAddress: string) {
  const fallbackName = fallbackDisplayName(walletAddress);
  await sql`
    insert into users (privy_did, solana_address, display_name)
    values (${privyDid}, ${walletAddress}, ${fallbackName})
    on conflict (privy_did) do update
    set solana_address = excluded.solana_address, updated_at = now()
  `;
}