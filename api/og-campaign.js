export default async function handler(req, res) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Campaign ID required' });
  }

  try {
    // Fetch campaign data from DevFun SDK endpoint
    const response = await fetch(`https://kqotxdabyxludzfndftl.supabase.co/rest/v1/campaigns?id=eq.${id}`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxb3R4ZGFieXhsdWR6Zm5kZnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1NTk2NTMsImV4cCI6MjA0NzEzNTY1M30.8xwD2PkSZVdM2f7hGx5VjYiREBXcaOxg5gw9nGK4v3s',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxb3R4ZGFieXhsdWR6Zm5kZnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1NTk2NTMsImV4cCI6MjA0NzEzNTY1M30.8xwD2PkSZVdM2f7hGx5VjYiREBXcaOxg5gw9nGK4v3s'
      }
    });
    
    if (!response.ok) {
      throw new Error('Campaign not found');
    }
    
    const campaigns = await response.json();
    const campaign = campaigns[0];
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    // Return HTML with proper Open Graph tags
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${campaign.title}">
  <meta property="og:description" content="${campaign.description.slice(0, 200)}">
  <meta property="og:image" content="${campaign.image || 'https://dropfund.app/Dropfund%20logo%20drop%20lines%202.png'}">
  <meta property="og:url" content="https://dropfund.app/campaign/${id}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${campaign.title}">
  <meta name="twitter:description" content="${campaign.description.slice(0, 200)}">
  <meta name="twitter:image" content="${campaign.image || 'https://dropfund.app/Dropfund%20logo%20drop%20lines%202.png'}">
  <meta http-equiv="refresh" content="0; url=/campaign/${id}">
  <title>${campaign.title} - DropFund</title>
</head>
<body>
  <script>window.location.href = '/campaign/${id}';</script>
</body>
</html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(404).json({ error: 'Campaign not found' });
  }
}
