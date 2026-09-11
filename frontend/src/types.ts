export interface Campaign {
  id: string;
  title: string;
  description: string;
  goal: bigint;
  duration: bigint;
  imageUrl: string;
  thumbnailUrl: [] | [string];
  creatorWalletAddress: string;
  creatorDisplayName: string;
  isReported: boolean;
  createdAt: bigint;
  endTimestamp: [] | [bigint];
  status: string;
  totalRaised: bigint;
  donationCount: bigint;
  websiteUrl: [] | [string];
  twitterUrl: [] | [string];
  telegramUrl: [] | [string];
  category: string;
}

export type CampaignSummary = Omit<Campaign, 'description' | 'imageUrl'>;

export interface Donation {
  mainTransactionSignature: string;
  feeTransactionSignature: string;
  amount: bigint;
  feeAmount: bigint;
  donorWalletAddress: string;
  campaignId: string;
  timestamp: bigint;
}

export interface UserProfile {
  name: string;
  walletAddress: string;
}
