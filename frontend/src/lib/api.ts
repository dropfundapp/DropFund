import type { Campaign, CampaignComment, CampaignSummary, DiscoveryItem, Donation, UserProfile } from '../types';

export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json().catch(() => null);
  if (body === null) {
    throw new ApiRequestError('API returned an invalid response. Use Vercel dev when testing donation writes locally.', response.status);
  }
  if (response.status === 202) {
    throw new ApiRequestError(body?.error || 'Donation confirmation is pending', response.status);
  }
  if (!response.ok) throw new ApiRequestError(body?.error || body?.message || `API request failed (${response.status})`, response.status);
  return body as T;
}

function optionalValue(value: unknown) {
  const normalized = Array.isArray(value) ? value[0] : value;
  return typeof normalized === 'string' && normalized.trim().length > 0
    ? [normalized] as [] | [string]
    : [] as [] | [string];
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
  return {
    ...raw,
    message: typeof raw.message === 'string' ? raw.message : null,
    donorName: typeof raw.donorName === 'string' && raw.donorName ? raw.donorName : 'Dropfund supporter',
    donorImage: typeof raw.donorImage === 'string' && raw.donorImage ? raw.donorImage : null,
    amount: BigInt(raw.amount),
    feeAmount: BigInt(raw.feeAmount),
    timestamp: BigInt(raw.timestamp),
  };
}

function parseComment(raw: any): CampaignComment {
  return {
    ...raw,
    id: String(raw.id),
    authorImage: typeof raw.authorImage === 'string' && raw.authorImage ? raw.authorImage : null,
    isCreator: Boolean(raw.isCreator),
    timestamp: BigInt(raw.timestamp),
  };
}

function parseDiscoveryItem(raw: any): DiscoveryItem {
  return { ...raw, amount: raw.amount === undefined ? undefined : BigInt(raw.amount), timestamp: BigInt(raw.timestamp) };
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
  donationsByCreator: async (walletAddress: string) => (await request<any[]>(`/api/donations?creatorWalletAddress=${encodeURIComponent(walletAddress)}`)).map(parseDonation),
  commentsByCampaign: async (campaignId: string) => (await request<any[]>(`/api/comments?campaignId=${encodeURIComponent(campaignId)}`)).map(parseComment),
  discoveryFeed: async () => (await request<any[]>('/api/feed')).map(parseDiscoveryItem),
  profile: (walletAddress: string, token: string) => request<{ name: string; walletAddress: string; image: string | null }>(`/api/profile?walletAddress=${encodeURIComponent(walletAddress)}`, { headers: { Authorization: `Bearer ${token}` } }),
  uploadCampaignImage: (image: string, walletAddress: string, token: string) => request<{ imageUrl: string }>('/api/media', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ image, walletAddress }) }),
  reportCampaign: (campaignId: string, walletAddress: string, reason: string, token: string) => request<{ ok: true }>('/api/reports', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ campaignId, walletAddress, reason }) }),
  saveProfile: (profile: UserProfile, image: string | null, token: string) => request<{ ok: true; name: string }>('/api/profile', { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...profile, image }) }),
  createCampaign: (params: Record<string, unknown>, token: string) => request<{ id: string }>('/api/campaigns', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(params) }),
  addDonation: (params: Record<string, unknown>, token: string) => request<{ ok: true; donorName: string; donorImage: string | null }>('/api/donations', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(params) }),
  addComment: (params: { campaignId: string; authorWalletAddress: string; body: string }, token: string) => request('/api/comments', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(params) }),
};
