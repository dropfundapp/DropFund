import { PrivyClient } from '@privy-io/server-auth';

let client: PrivyClient | null = null;

function getClient() {
  if (!client) {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Response('Privy server credentials are not configured. Add PRIVY_APP_ID and PRIVY_APP_SECRET to the local Vercel environment.', { status: 503 });
    }
    client = new PrivyClient(appId, appSecret);
  }
  return client;
}

export async function requirePrivyUser(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Response('Unauthorized', { status: 401 });
  const claims = await getClient().verifyAuthToken(authorization.slice(7));
  return claims.userId;
}

export async function requireWallet(request: Request, walletAddress: string) {
  const userId = await requirePrivyUser(request);
  const user = await getClient().getUser(userId);
  const ownsWallet = user.linkedAccounts.some((account: any) => account.type === 'wallet' && account.chainType === 'solana' && account.address === walletAddress);
  if (!ownsWallet) throw new Response('Wallet does not belong to the authenticated user', { status: 403 });
  return userId;
}
