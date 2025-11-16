# Quick Start: Deploy to Vercel

Your project is ready for Vercel deployment! Here's the fastest path to get live.

## ✅ What's Already Done

- ✅ Debug UI gated with `REACT_APP_DEBUG` flag
- ✅ Environment configuration ready
- ✅ Build tested and working
- ✅ `.env.local` for local development
- ✅ `.env.example` as reference

## 🚀 Deploy in 5 Minutes

### Step 1: Push to GitHub (if not already)

```bash
cd /Users/xyz/dropfund
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Deploy to Vercel

**Option A: Vercel Website** (Easiest)
1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "New Project"
4. Import your `dropfund` repo
5. Click "Deploy" (uses defaults)

**Option B: Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Step 3: Add Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables:

```
REACT_APP_DEBUG=false
REACT_APP_NETWORK=https://api.devnet.solana.com
REACT_APP_PROGRAM_ID=5ZWLcrXGpKmV7R7u4LpiVKmVcdEYc7trztEQqYYDvXyz
REACT_APP_PLATFORM_WALLET=ANaSzJRXdTjCyih1W6Zvf63AXcPSgahS1CpsxX3oo8LR
```

Then **Redeploy** from the Deployments tab.

### Step 4: Add Your Domain

In Vercel → Project → Settings → Domains:
1. Click "Add Domain"
2. Enter your GoDaddy domain
3. Vercel shows DNS records

Go to GoDaddy → My Products → Your Domain → DNS:
- Add the exact A and CNAME records Vercel provides
- Wait 10-30 minutes for DNS propagation

### Step 5: Test

Visit your domain:
- ✅ No debug UI visible
- ✅ Connect Phantom wallet
- ✅ Create test campaign
- ✅ Make test donation
- ✅ Verify on Solana Explorer

## 🧪 Test Locally First

```bash
# Preview production build
npm run build
npx serve -s build -l 3000
```

Open http://localhost:3000 and verify:
- No debug panel shown (REACT_APP_DEBUG defaults to false without .env.local)
- Everything works as expected

## 📚 Need More Details?

- **Full Guide**: See `VERCEL_DEPLOYMENT.md`
- **Changes Summary**: See `DEPLOYMENT_SUMMARY.md`
- **Environment Vars**: See `.env.example`

## 🔥 Common Issues

**Build fails**: Run `npm run build` locally first
**Domain not working**: Wait 30 min, check DNS at dnschecker.org
**Env vars not working**: Redeploy after adding them in Vercel
**Debug UI still showing**: Set `REACT_APP_DEBUG=false` in Vercel

## 🎯 You're Ready!

Your project is production-ready with:
- ✅ Environment-based configuration
- ✅ Debug gating for production
- ✅ Clean build output
- ✅ Full deployment documentation

Start with Step 1 above and you'll be live in minutes! 🚀
