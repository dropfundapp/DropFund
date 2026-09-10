import { requireWallet } from './_lib/auth.js';

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function json(res: any, body: unknown, status = 200) {
  return res.status(status)
    .setHeader('Content-Type', 'application/json')
    .setHeader('X-Content-Type-Options', 'nosniff')
    .json(body);
}

async function koraRpc(method: string, params: Record<string, unknown>) {
  const endpoint = process.env.KORA_RPC_URL;
  if (!endpoint) {
    throw new HttpError(503, 'KORA_RPC_URL is not configured');
  }

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  if (process.env.KORA_API_KEY) {
    headers['x-api-key'] = process.env.KORA_API_KEY;
    headers.authorization = `Bearer ${process.env.KORA_API_KEY}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new HttpError(502, 'Kora RPC request failed');
  }

  const payload = await response.json();
  if (payload.error) {
    const message = typeof payload.error?.message === 'string' ? payload.error.message : 'Kora RPC error';
    throw new HttpError(400, message);
  }

  return payload.result;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const signer = await koraRpc('getPayerSigner', {});
      return json(res, {
        signerAddress: signer.signer_address,
        paymentAddress: signer.payment_address,
      });
    }

    if (req.method !== 'POST') {
      return json(res, { error: 'Method not allowed' }, 405);
    }

    const body = req.body || {};
    const donorWalletAddress = String(body.donorWalletAddress || '');
    const transaction = String(body.transaction || '');

    if (!donorWalletAddress || !transaction) {
      return json(res, { error: 'Missing donor wallet address or transaction' }, 400);
    }

    const userId = await requireWallet(req, donorWalletAddress);
    const relayResult = await koraRpc('signAndSendTransaction', {
      transaction,
      respond_after: 'confirmed',
      user_id: userId,
    });

    return json(res, {
      signature: relayResult.signature,
      signerPubkey: relayResult.signer_pubkey,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      const message = error.status === 401 ? 'Unauthorized' : error.status === 403 ? 'Wallet does not belong to the authenticated user' : 'Request failed';
      return json(res, { error: message }, error.status || 400);
    }
    if (error instanceof HttpError) {
      return json(res, { error: error.message }, error.status);
    }
    console.error('Kora API error:', error);
    return json(res, { error: 'Internal server error' }, 500);
  }
}
