# DropFund Postgres migration

The Vercel backend uses Neon Postgres. Create a new empty Neon database, run `schema.sql`, and configure these Vercel environment variables:

- `DATABASE_URL`
- `PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- `SOLANA_RPC_URL`

The API never trusts a wallet address from the browser by itself. Mutation routes must verify the Privy bearer token and confirm that the requested Solana wallet belongs to that Privy user. Donation recording also verifies the confirmed Solana transaction and rejects duplicate signatures.
