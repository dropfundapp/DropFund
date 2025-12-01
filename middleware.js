import { NextResponse } from 'next/server';

export async function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const url = request.nextUrl;
  
  // Check if it's a social media bot
  const isBot = /bot|crawler|spider|telegram|twitter|facebook|linkedin|whatsapp|slackbot|discordbot/i.test(userAgent);
  
  // Check if it's a campaign URL
  const campaignMatch = url.pathname.match(/^\/campaign\/(.+)$/);
  
  if (isBot && campaignMatch) {
    const campaignId = campaignMatch[1];
    
    try {
      // Fetch campaign data
      const response = await fetch(`https://kqotxdabyxludzfndftl.supabase.co/rest/v1/campaigns?id=eq.${campaignId}`, {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxb3R4ZGFieXhsdWR6Zm5kZnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE1NTk2NTMsImV4cCI6MjA0NzEzNTY1M30.8xwD2PkSZVdM2f7hGx5VjYiREBXcaOxg5gw9nGK4v3s'
        }
      });
      
      if (response.ok) {
        const campaigns = await response.json();
        const campaign = campaigns[0];
        
        if (campaign) {
          const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${campaign.title}" />
  <meta property="og:description" content="${campaign.description.slice(0, 200)}" />
  <meta property="og:image" content="${campaign.image || 'https://dropfund.app/Dropfund%20logo%20drop%20lines%202.png'}" />
  <meta property="og:url" content="https://dropfund.app/campaign/${campaignId}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${campaign.title}" />
  <meta name="twitter:description" content="${campaign.description.slice(0, 200)}" />
  <meta name="twitter:image" content="${campaign.image || 'https://dropfund.app/Dropfund%20logo%20drop%20lines%202.png'}" />
  <title>${campaign.title} - DropFund</title>
  <meta http-equiv="refresh" content="0; url=/campaign/${campaignId}">
</head>
<body>
  <h1>${campaign.title}</h1>
  <p>Redirecting...</p>
</body>
</html>`;
          
          return new NextResponse(html, {
            headers: {
              'content-type': 'text/html',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/campaign/:id*',
};
