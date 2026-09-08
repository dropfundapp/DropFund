export function getSolscanUrl(signature: string, cluster: 'mainnet' | 'devnet' = 'mainnet'): string {
  const clusterParam = cluster === 'mainnet' ? '' : `?cluster=${cluster}`;
  return `https://solscan.io/tx/${signature}${clusterParam}`;
}
