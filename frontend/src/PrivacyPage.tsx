
import { useEffect } from 'react';

export default function PrivacyPage() {
        useEffect(() => {
                window.scrollTo(0, 0);
        }, []);
  return (
    <div className="container py-12 w-full max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">PRIVACY POLICY</h1>
      <p className="text-sm text-muted-foreground mb-8">Last Updated: 5 December 2025</p>
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <p>This Privacy Policy (“Policy”) describes how DropFund (“DropFund,” “we,” “us,” or “our”) collects, uses, and protects limited information when you (“you” or “your”) access or use the DropFund platform.</p>
        <p>By using DropFund, you consent to the collection and processing of data as described in this Policy.</p>
        <h2>1. Overview</h2>
        <p>DropFund is a crowdfunding platform using Solana for USDC settlement and managed web infrastructure for campaign metadata and account services.
We do not store, access, or control user funds or private keys.
Data collected is limited to what is needed to operate the Platform, provide transparency, and prevent abuse.</p>
        <h2>2. Information We Collect</h2>
        <p>We collect only the information necessary for the Platform to operate effectively, including:</p>
        <ul>
          <li>Wallet Addresses used to make or receive donations.</li>
          <li>Campaign Data submitted by creators (title, description, image URLs, target goal, and links).</li>
          <li>Transaction Data that is already publicly visible on the Solana blockchain.</li>
          <li>Usage Analytics, such as browser type, device type, approximate location (non-identifying), and performance metrics.</li>
        </ul>
        <p>We do not collect names, emails, government IDs, or private keys.
If you voluntarily contact DropFund for support, we may temporarily retain your communication details to resolve your request.</p>
        <h2>3. Cookies and Analytics</h2>
        <p>DropFund may use essential cookies and privacy-preserving analytics tools to measure Platform performance and user engagement.
These cookies do not track individuals across websites and contain no personally identifiable information.
We do not use cookies for marketing, targeted advertising, or third-party tracking.</p>
        <h2>4. On-Chain and Off-Chain Data Storage</h2>
        <ul>
          <li>On-chain data: Donation settlement and transaction details are recorded on the Solana network.</li>
          <li>Off-chain metadata: Campaign, profile, and image metadata may be stored by DropFund and its infrastructure providers.</li>
        </ul>
        <p>DropFund does not store private keys. Transaction signatures and campaign metadata may be stored to provide the Platform and prevent replay or fraud.</p>
        <h2>5. How We Use Data</h2>
        <p>We use the limited data we collect to:</p>
        <ul>
          <li>Display and organize campaigns and donations;</li>
          <li>Improve the functionality, reliability, and user experience of the Platform;</li>
          <li>Monitor performance and prevent spam or abuse;</li>
          <li>Develop future features such as optional milestone-based vaults;</li>
          <li>Comply with legal obligations when applicable.</li>
        </ul>
        <p>We never sell, rent, or trade user data.</p>
        <h2>6. Sharing and Disclosure</h2>
        <p>We may share limited, non-personal, or aggregated information with:</p>
        <ul>
          <li>Infrastructure providers, database providers, RPC providers, and wallet/authentication providers;</li>
          <li>Analytics or security services under confidentiality;</li>
          <li>Regulatory or legal authorities, if required by law.</li>
        </ul>
        <p>We will never share or sell user data for marketing or advertising purposes.</p>
        <h2>7. Blockchain Transparency</h2>
        <p>All donation activity is executed on the public Solana blockchain, while campaign metadata and records may be stored in DropFund’s managed database.
Your wallet address, transaction amount, and timestamps are visible on-chain and cannot be altered or deleted.
Please consider the permanent nature of blockchain transactions before transacting.</p>
        <h2>8. Data Retention</h2>
        <p>DropFund retains minimal off-chain metadata only as long as required to maintain functionality, comply with laws, or perform security reviews.
Confirmed Solana blockchain data cannot be deleted or modified.</p>
        <h2>9. Security</h2>
        <p>DropFund uses Privy authentication, server-side authorization, database access controls, and standard encryption.
You are responsible for safeguarding your wallet and credentials.</p>
        <h2>10. Minors</h2>
        <p>DropFund is not intended for individuals under 18. We do not knowingly collect information from minors.</p>
        <h2>11. International Use</h2>
        <p>DropFund operates globally through decentralized blockchains.
By using the Platform, you consent to global data transmission and storage, including in the United States, EU, and British Virgin Islands.</p>
        <h2>12. Updates to this Policy</h2>
        <p>We may periodically update this Policy to reflect technical upgrades, changes in law, or new features.
Continued use of the Platform after an update constitutes acceptance of the revised Policy.</p>
        <h2>13. Contact</h2>
        <p>DropFund operates as a decentralized protocol.
If you have questions about this Policy, you may contact the team through the verified communication links on the official website or listed in the smart-contract metadata.</p>
      </div>
    </div>
  );
}
