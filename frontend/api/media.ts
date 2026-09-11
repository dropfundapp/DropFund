import { requireWallet } from './_lib/auth.js';
import { createHash } from 'node:crypto';

const MAX_IMAGE_DATA_URL_LENGTH = 4_000_000;
const imageDataUrlPattern = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

function json(res: any, body: unknown, status = 200) {
  return res.status(status).setHeader('Content-Type', 'application/json').setHeader('X-Content-Type-Options', 'nosniff').json(body);
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);
    const walletAddress = String(req.body?.walletAddress || '');
    const image = String(req.body?.image || '');
    if (!imageDataUrlPattern.test(image) || image.length > MAX_IMAGE_DATA_URL_LENGTH) {
      return json(res, { error: 'Upload a JPEG, PNG, or WebP image smaller than 4 MB' }, 400);
    }
    await requireWallet(req, walletAddress);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) return json(res, { error: 'Media uploads are not configured' }, 503);

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'dropfund/campaigns';
    const transformation = 'c_limit,w_1600,h_1200/f_webp,q_auto/fl_strip_profile';
    const signature = createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}&transformation=${transformation}${apiSecret}`).digest('hex');
    const form = new FormData();
    form.set('file', image);
    form.set('api_key', apiKey);
    form.set('timestamp', String(timestamp));
    form.set('signature', signature);
    form.set('folder', folder);
    form.set('resource_type', 'image');
    form.set('transformation', transformation);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result.secure_url !== 'string') {
      console.error('Cloudinary upload failed:', result);
      return json(res, { error: 'Image upload failed' }, 502);
    }
    const sanitizedUrl = result.secure_url.replace('/upload/', '/upload/c_limit,w_1600,h_1200/f_webp,q_auto/fl_strip_profile/');
    return json(res, { imageUrl: sanitizedUrl });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Media API error:', error);
    return json(res, { error: 'Image upload failed' }, 500);
  }
}