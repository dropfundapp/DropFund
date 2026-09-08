
import { useEffect } from 'react';

export default function TermsPage() {
        useEffect(() => {
                window.scrollTo(0, 0);
        }, []);
  return (
    <div className="container py-12 w-full max-w-3xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">TERMS OF USE</h1>
      <p className="text-sm text-muted-foreground mb-8">Last Updated: 5 December 2025</p>
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <p>These Terms of Use (“Terms”) constitute a legally binding agreement between you (“you” or “your”) and DropFund (“DropFund”, “we”, “our”, or “us”).</p>
        <p>By accessing or using DropFund, its APIs, Solana transactions, or related user interfaces (collectively, the “Platform”), you agree that you have read, understood, and accepted these Terms. If you do not agree, you must not access or use the Platform.</p>
        <h2>1. Overview</h2>
        <p>DropFund is a crowdfunding platform using Solana for USDC settlement and managed web infrastructure for campaign records.
It enables creators to launch campaigns and receive direct, wallet-to-wallet donations with full transparency and minimal fees.</p>
        <p>Campaign creation uses DropFund’s API, while donations settle through Solana transactions.
DropFund never takes custody of user funds. DropFund currently does not add a platform fee, though network fees may apply.</p>
        <p>All donations are final, irreversible, and non-refundable. DropFund does not guarantee the success or outcome of any campaign.</p>
        <h2>2. Eligibility</h2>
        <p>You may use the Platform only if you:</p>
        <ol>
          <li>Are at least 18 years old;</li>
          <li>Have full legal capacity to enter into these Terms;</li>
          <li>Comply with the laws of your jurisdiction; and</li>
          <li>Are not a resident or citizen of a sanctioned or prohibited region, including Cuba, Iran, North Korea, Syria, or Russia.</li>
        </ol>
        <p>We reserve the right to restrict access from prohibited jurisdictions at our discretion.</p>
        <h2>3. Platform Use</h2>
        <p>DropFund is a non-custodial, blockchain-based interface.
When you make or receive a donation, you approve a transaction through your Privy-managed Solana wallet.</p>
        <ul>
          <li>You retain full control of your wallets and private keys.</li>
          <li>DropFund cannot recover, reverse, or alter your transactions.</li>
          <li>You are solely responsible for verifying all transaction details before approving them.</li>
        </ul>
        <p>Loss of wallet access, seed phrases, or private keys will result in permanent loss of funds. DropFund cannot assist in recovery.</p>
        <h2>4. Campaigns</h2>
        <p>Creators can publish fundraising campaigns using the DropFund interface.
        Campaign metadata is stored by DropFund’s managed backend, while donation settlement remains verifiable on Solana.</p>
        <p>Donations occur directly on Solana using USDC. Network fees may apply.</p>
        <p>In future versions, DropFund may introduce optional vaults or milestone-based funding, allowing creators to withdraw in stages. These features will be governed by updated smart-contract logic and transparent on-chain rules.</p>
        <p>DropFund does not review, endorse, or verify the claims of campaign creators.
By donating, you acknowledge that you are contributing voluntarily and at your own risk.</p>
        <h2>5. Protocol Fees</h2>
        <p>DropFund currently does not add a platform fee. Solana network fees and any third-party service fees may still apply.</p>
        <h2>6. Transactions and Smart-Contract Risks</h2>
        <p>All on-chain actions are final and immutable. By using the Platform, you understand and accept that:</p>
        <ul>
          <li>Blockchain transactions may be delayed, fail, or cost variable network fees.</li>
          <li>You may permanently lose access to funds by mismanaging private keys or approving malicious transactions.</li>
          <li>Smart contracts may contain vulnerabilities, bugs, or exploits that could result in loss of funds.</li>
          <li>DropFund cannot control or reverse blockchain-level events or network outages.</li>
        </ul>
        <p>DropFund and its contributors assume no liability for any direct or indirect loss arising from the use of the Platform or its smart contracts.</p>
        <h2>7. No Financial or Investment Advice</h2>
        <p>DropFund does not provide investment, legal, or financial advice.
Donations made through DropFund are not investments and do not create ownership, equity, or revenue-sharing rights.
Creators may fail to achieve campaign goals, and DropFund bears no responsibility for those outcomes.</p>
        <h2>8. Intellectual Property</h2>
        <p>All DropFund branding, code, and interfaces are owned or licensed by DropFund or its contributors under applicable open-source or proprietary licenses.
Users retain rights to their campaign content but grant DropFund a non-exclusive, royalty-free, worldwide license to display campaign data and media on the Platform and related marketing materials.</p>
        <h2>9. Privacy & Data</h2>
        <p>DropFund operates with minimal data collection.</p>
        <ul>
          <li>User authentication is performed through Privy and embedded Solana wallets.</li>
          <li>We do not collect names, emails, or personal identifiers unless voluntarily provided.</li>
          <li>All publicly visible activity (campaigns, donations, transactions) is recorded on-chain and visible through blockchain explorers.</li>
        </ul>
        <p>We do not sell or share user data with third parties.
For further details, see our Privacy Policy.</p>
        <h2>10. Limitation of Liability</h2>
        <p>To the fullest extent permitted by law, DropFund, its contributors, and affiliates shall not be liable for:</p>
        <ul>
          <li>Any loss of funds, reputation, or opportunity resulting from your use of the Platform;</li>
          <li>Any smart-contract bugs, blockchain downtime, or wallet issues;</li>
          <li>Any false, misleading, or incomplete information provided by campaign creators;</li>
          <li>Any consequential, incidental, or indirect damages, including loss of profits or data.</li>
        </ul>
        <p>DropFund’s aggregate liability, if any, shall not exceed the total protocol fees collected from your transactions.</p>
        <h2>11. Indemnification</h2>
        <p>You agree to defend, indemnify, and hold harmless DropFund, its developers, and affiliates from any claims, damages, or liabilities arising from your use of the Platform, your violation of these Terms, or your breach of any applicable laws or third-party rights.</p>
        <h2>12. Upgrades and Modifications</h2>
        <p>DropFund’s APIs and services may be upgraded periodically for performance, security, or feature improvements.
We may update these Terms to reflect such changes. The “Last Updated” date indicates the current version. Continued use of the Platform constitutes acceptance of the revised Terms.</p>
        <h2>13. Jurisdiction & Governing Law</h2>
        <p>These Terms are governed by the laws of the British Virgin Islands (BVI).
Any disputes shall be resolved by binding arbitration in Tortola, BVI, under the BVI Arbitration Act 2013, conducted in English.
Class or collective actions are expressly waived.
Because DropFund is a decentralized protocol, arbitration applies solely to disputes arising from the operation of DropFund-managed smart contracts or interfaces, not between individual users.</p>
        <h2>14. Contact</h2>
        <p>DropFund operates as a decentralized project.
For general inquiries, community support, or security disclosures, users may reach the DropFund team through verified communication channels listed on the official website or in the smart-contract metadata.</p>
      </div>
    </div>
  );
}
