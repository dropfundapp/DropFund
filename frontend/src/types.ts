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
  creatorImage: string | null;
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
  message: string | null;
  donorWalletAddress: string;
  donorName: string;
  donorImage: string | null;
  campaignId: string;
  timestamp: bigint;
}

export interface CampaignComment {
  id: string;
  campaignId: string;
  authorWalletAddress: string;
  authorName: string;
  authorImage: string | null;
  body: string;
  timestamp: bigint;
  isCreator: boolean;
}

export interface DiscoveryItem {
  id: string;
  type: 'campaign' | 'donation';
  campaignId: string;
  campaignTitle: string;
  imageUrl: string;
  actorName: string;
  amount?: bigint;
  timestamp: bigint;
}

export interface UserProfile {
  name: string;
  walletAddress: string;
}
