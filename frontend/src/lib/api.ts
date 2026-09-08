import type { Campaign, CampaignSummary, Donation, UserProfile } from '../types';

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || body?.message || `API request failed (${response.status})`);
  return body as T;
}

function optionalValue(value: unknown) {
  return value ? [String(value)] as [] | [string] : [] as [] | [string];
}

export function parseCampaign(raw: any): Campaign {
  return {
    ...raw,
    goal: BigInt(raw.goal),
    duration: BigInt(raw.duration),
    createdAt: BigInt(raw.createdAt),
    totalRaised: BigInt(raw.totalRaised),
    donationCount: BigInt(raw.donationCount),
    thumbnailUrl: optionalValue(raw.thumbnailUrl?.[0] ?? raw.thumbnailUrl),
    websiteUrl: optionalValue(raw.websiteUrl?.[0] ?? raw.websiteUrl),
    twitterUrl: optionalValue(raw.twitterUrl?.[0] ?? raw.twitterUrl),
    telegramUrl: optionalValue(raw.telegramUrl?.[0] ?? raw.telegramUrl),
    endTimestamp: optionalValue(raw.endTimestamp?.[0] ?? raw.endTimestamp),
  };
}

export function parseSummary(raw: any): CampaignSummary {
  return parseCampaign(raw) as CampaignSummary;
}

export function parseDonation(raw: any): Donation {
  return { ...raw, amount: BigInt(raw.amount), feeAmount: BigInt(raw.feeAmount), timestamp: BigInt(raw.timestamp) };
}

export const api = {
  campaigns: async () => ((await request<any[]>('/api/campaigns')) || []).map(parseSummary),
  campaign: async (id: string) => {
    const rows = await request<any[]>(`/api/campaigns?id=${encodeURIComponent(id)}`);
    return rows[0] ? parseCampaign(rows[0]) : null;
  },
  campaignsByCreator: async (walletAddress: string) => (await request<any[]>(`/api/campaigns?creator=${encodeURIComponent(walletAddress)}`)).map(parseCampaign),
  donationsByCampaign: async (campaignId: string) => (await request<any[]>(`/api/donations?campaignId=${encodeURIComponent(campaignId)}`)).map(parseDonation),
  donationsByWallet: async (walletAddress: string) => (await request<any[]>(`/api/donations?donorWalletAddress=${encodeURIComponent(walletAddress)}`)).map(parseDonation),
  saveProfile: (profile: UserProfile, image: string | null, token: string) => request('/api/profile', { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...profile, image }) }),
  createCampaign: (params: Record<string, unknown>, token: string) => request<{ id: string }>('/api/campaigns', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(params) }),
  addDonation: (params: Record<string, unknown>, token: string) => request('/api/donations', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(params) }),
};
