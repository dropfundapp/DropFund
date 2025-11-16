# Vercel Deployment Guide

Complete guide to deploy your crowdfunding platform to Vercel with your GoDaddy domain.

## Prerequisites

- GitHub account
- Vercel account (free: https://vercel.com)
- GoDaddy domain
- Project pushed to GitHub

## Step 1: Prepare Your Repository

1. **Commit all changes**:
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

2. **Verify .gitignore includes**:
```
.env.local
.env*.local
node_modules/
build/
```

## Step 2: Deploy to Vercel

### Option A: Vercel Dashboard (Recommended for first-time)

1. Go to https://vercel.com and sign in
2. Click **"Add New Project"**
3. Click **"Import Git Repository"**
4. Select your `dropfund` repository
5. Configure project:
   - **Framework Preset**: Create React App (auto-detected)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `build` (default)
6. Click **"Deploy"**

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy from project root
cd /Users/xyz/dropfund
vercel --prod
```

## Step 3: Configure Environment Variables in Vercel

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

| Name | Value | Environment |
|------|-------|-------------|
| `REACT_APP_DEBUG` | `false` | Production |
| `REACT_APP_NETWORK` | `https://api.devnet.solana.com` | Production |
| `REACT_APP_PROGRAM_ID` | `5ZWLcrXGpKmV7R7u4LpiVKmVcdEYc7trztEQqYYDvXyz` | Production |
| `REACT_APP_PLATFORM_WALLET` | `ANaSzJRXdTjCyih1W6Zvf63AXcPSgahS1CpsxX3oo8LR` | Production |

**Important**: 
- Set `REACT_APP_DEBUG=false` for production to hide debug UI
- For mainnet later, update `REACT_APP_NETWORK` to `https://api.mainnet-beta.solana.com`
- Update `REACT_APP_PROGRAM_ID` and `REACT_APP_PLATFORM_WALLET` for mainnet

4. Click **"Save"**
5. **Redeploy** from Deployments tab to apply new env vars

## Step 4: Add Your GoDaddy Domain to Vercel

1. In Vercel dashboard, go to your project
2. Navigate to **Settings** → **Domains**
3. Click **"Add Domain"**
4. Enter your domain (e.g., `yourdomain.com`)
5. Vercel will show you DNS records to add

### Example DNS Records from Vercel:

Vercel typically provides one of these patterns:

**Pattern A (A Record + CNAME):**
```
Type: A
Name: @ (or yourdomain.com)
Value: 76.76.19.165
TTL: 3600

Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600
```

**Pattern B (CNAME only):**
```
Type: CNAME
Name: @ (or yourdomain.com)
Value: cname.vercel-dns.com
TTL: 3600
```

## Step 5: Update DNS in GoDaddy

1. Log in to your GoDaddy account
2. Go to **My Products** → **Domains**
3. Click **DNS** next to your domain
4. Add the exact records Vercel showed you:

### Adding A Record:
- Click **"Add"** → Select **"A"**
- **Name**: `@` (represents root domain)
- **Value**: The IP address from Vercel (e.g., `76.76.19.165`)
- **TTL**: `3600` (or custom)
- Click **"Save"**

### Adding CNAME Record:
- Click **"Add"** → Select **"CNAME"**
- **Name**: `www` (or as specified by Vercel)
- **Value**: The hostname from Vercel (e.g., `cname.vercel-dns.com`)
- **TTL**: `3600` (or custom)
- Click **"Save"**

### Important GoDaddy Notes:
- If you have existing A or CNAME records for `@` or `www`, delete them first
- DNS propagation takes 10-30 minutes (sometimes up to 48 hours)
- You can check propagation at https://dnschecker.org

## Step 6: Verify SSL Certificate

1. Wait 5-10 minutes after DNS propagation
2. Vercel automatically provisions SSL certificate via Let's Encrypt
3. Visit your domain - should show 🔒 HTTPS

## Step 7: Test Your Deployment

1. Visit `https://yourdomain.com`
2. Test wallet connection (Phantom)
3. Create a test campaign
4. Make a test donation (small devnet amount)
5. Verify transaction on Solana Explorer (devnet)
6. Confirm no debug UI is visible (REACT_APP_DEBUG=false)
7. Check browser console - should have minimal logs

## Step 8: Enable Automatic Deployments

Vercel automatically redeploys when you push to main branch.

To deploy:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will detect the push and redeploy automatically.

## Troubleshooting

### Build Fails
- Check Vercel build logs in the **Deployments** tab
- Ensure all dependencies are in `package.json`
- Run `npm run build` locally first to catch errors

### Domain Not Working
- Wait 30 minutes for DNS propagation
- Check DNS records at https://dnschecker.org
- Verify DNS records in GoDaddy match Vercel exactly
- Try clearing browser cache / incognito mode

### Environment Variables Not Working
- Verify they're set in Vercel dashboard
- **Must start with** `REACT_APP_` for Create React App
- Redeploy after adding/changing env vars
- Check build logs to see if values are picked up

### Dev.fun Not Working
- Ensure you're logged into dev.fun in the deployed app
- Check browser console for CORS errors
- Verify devbaseClient is initialized (should be automatic)

### Wallet Not Connecting
- Ensure Phantom extension is installed
- Check console for errors
- Test with different wallet (Solflare, Backpack)
- Verify RPC endpoint is accessible

## Advanced: Preview Deployments

Every branch and PR gets a preview URL:
- Push to a branch: `git push origin feature-branch`
- Vercel creates preview at `feature-branch-dropfund.vercel.app`
- Test before merging to main

## Local Testing Before Deploy

Preview production build locally:
```bash
# Build production bundle
npm run build

# Serve locally (install serve if needed)
npx serve -s build -l 3000

# Open http://localhost:3000
```

## Monitoring & Analytics

1. **Vercel Analytics**: Enable in project settings (shows pageviews, performance)
2. **Vercel Logs**: Real-time function logs in dashboard
3. **Solana Explorer**: Track on-chain transactions at https://explorer.solana.com

## Next Steps After Deployment

- [ ] Test full end-to-end flow on domain
- [ ] Share domain with beta testers
- [ ] Monitor Vercel analytics for traffic
- [ ] Prepare mainnet deployment plan:
  - Deploy program to mainnet
  - Update env vars (PROGRAM_ID, NETWORK, PLATFORM_WALLET)
  - Test with small amounts first
- [ ] Set up monitoring/alerting for errors
- [ ] Consider adding Google Analytics or similar

## Security Checklist

- [x] Debug UI hidden in production (`REACT_APP_DEBUG=false`)
- [x] No API keys hardcoded in source
- [x] `.env.local` in `.gitignore`
- [ ] Test with different wallets (Phantom, Solflare)
- [ ] Review console logs in production (should be minimal)
- [ ] Verify transactions on Solana Explorer
- [ ] Set up error monitoring (Sentry, etc.) - optional

## Cost

- **Vercel**: Free tier includes:
  - 100 GB bandwidth/month
  - Unlimited sites
  - SSL certificates
  - Automatic deployments
- **GoDaddy Domain**: Already owned by you
- **Solana Devnet**: Free (test SOL from faucet)
- **Dev.fun**: Check their pricing (backend/devbase)

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Discord: https://vercel.com/discord
- Solana Docs: https://docs.solana.com
- Dev.fun Support: Check dev.fun dashboard

---

**Ready to deploy?** Start with Step 1 above!
