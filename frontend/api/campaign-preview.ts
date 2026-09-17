import { getDatabase } from './_lib/db.js';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]!));
}

function getOrigin(req: any) {
  const protocol = String(req.headers?.['x-forwarded-proto'] || 'https').split(',')[0];
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || 'dropfund.app').split(',')[0];
  return `${protocol}://${host}`;
}

export default async function handler(req: any, res: any) {
  const campaignId = typeof req.query?.campaignId === 'string' ? req.query.campaignId : '';
  const origin = getOrigin(req);
  const campaignUrl = `${origin}/campaign/${encodeURIComponent(campaignId)}`;

  if (!campaignId) return res.redirect(302, campaignUrl);

  try {
    const sql = getDatabase();
    const rows = await sql`
      select title, description, image_url, thumbnail_url
      from campaigns
      where id = ${campaignId}
      limit 1
    `;
    const campaign = rows[0];
    if (!campaign) return res.redirect(302, campaignUrl);

    const title = String(campaign.title).slice(0, 160);
    const description = String(campaign.description).replace(/\s+/g, ' ').trim().slice(0, 200);
    const image = String(campaign.image_url || campaign.thumbnail_url || `${origin}/assets/generated/campaign-placeholder.dim_400x300.jpg`);
    const redirectScript = JSON.stringify(campaignUrl).replace(/</g, '\\u003c');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
    return res.status(200).send(`<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Dropfund">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(campaignUrl)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <title>${escapeHtml(title)} | Dropfund</title>
  <script>window.location.replace(${redirectScript});</script>
</head><body><a href="${escapeHtml(campaignUrl)}">View campaign</a></body></html>`);
  } catch (error) {
    console.error('Campaign preview error:', error);
    return res.redirect(302, campaignUrl);
  }
}