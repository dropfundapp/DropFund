# DropFund

DropFund is a social crowdfunding platform for campaigns funded with USDC on Solana. Users sign in with Privy, receive an embedded Solana wallet, create campaigns, donate USDC, and withdraw USDC to external Solana wallets.

## Architecture

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Authentication and wallets:** Privy embedded Solana wallets
- **Settlement:** Solana mainnet USDC
- **Application API:** Vercel serverless functions
- **Database:** Neon Postgres
- **Verification:** Server-side Privy wallet checks and Solana transaction verification

The project no longer uses the previous ICP/Motoko backend or Cloudflare relay.

## Local Development

From the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

The Vite app runs at `http://localhost:3000` by default.

## Environment Variables

Copy `.env.example` to a local environment file and configure:

```env
DATABASE_URL=
PRIVY_APP_ID=
PRIVY_APP_SECRET=
SOLANA_RPC_URL=
VITE_PRIVY_APP_ID=
VITE_SOLANA_RPC_URL=
```

`PRIVY_APP_SECRET`, `DATABASE_URL`, and `SOLANA_RPC_URL` are server-side values. Never expose them with a `VITE_` prefix or commit them to Git.

## Database Setup

Create an empty Neon Postgres project, open its SQL Editor, and run [`frontend/db/schema.sql`](frontend/db/schema.sql). The schema creates profiles, campaigns, donations, and the required indexes.

## API Routes

The Vercel API lives in [`frontend/api`](frontend/api):

- `/api/campaigns` reads campaigns and creates authenticated campaigns
- `/api/donations` reads donations and verifies new Solana USDC transactions
- `/api/profile` reads and updates authenticated profiles

Donation signatures are checked server-side and duplicate signatures are rejected.

## Vercel Deployment

Configure the Vercel project with:

- **Root Directory:** `frontend`
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

Add the environment variables above to the required Vercel environments, then deploy the `main` branch.

## Security Notes

- Do not commit `.env`, `.env.development`, database URLs, Privy secrets, or private keys.
- Solana RPC URLs used by the browser are public and should be rate-limited.
- Donations must be verified against confirmed Solana transactions before being recorded.
- USDC transfers still require SOL for network fees unless a future fee-sponsorship flow is added.
