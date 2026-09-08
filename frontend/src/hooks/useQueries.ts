// Fetch donations made by the connected user (by wallet address)
export function useGetUserDonations(walletAddress: string | null) {
  return useQuery<Donation[]>({
    queryKey: ['userDonations', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];
      try {
        return await api.donationsByWallet(walletAddress);
      } catch (error: any) {
        console.error('❌ Error fetching user donations:', error);
        toast.error('Failed to load your donations');
        return [];
      }
    },
    enabled: !!walletAddress,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    retry: 2,
  });
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Campaign, Donation, UserProfile, CampaignSummary } from '../types';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { usePrivyAuth } from '../components/PrivyAuthProvider';

export function useGetCallerUserProfile() {
  // Profile fetching logic will be refactored for auto-creation. Placeholder for now.
  return { data: null, isLoading: false, isFetched: false };
}

export function useSaveCallerUserProfile() {
  const { getAccessToken } = usePrivyAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Authentication required');
      try {
        console.log('=== Saving user profile ===');
        await api.saveProfile(profile, null, token);
        console.log('✓ User profile saved successfully');
      } catch (error) {
        console.error('❌ Error saving user profile:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error: any) => {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile. Please try again.');
    },
  });
}

// CRITICAL: Public query - campaigns are visible to everyone without authentication
// This ensures all active campaigns load immediately on the home page with robust error handling
export function useGetCampaigns() {
  return useQuery<CampaignSummary[]>({
    queryKey: ['campaigns'],
    queryFn: async (): Promise<CampaignSummary[]> => {
      try {
        return await api.campaigns();
      } catch (error: any) {
        console.error('❌ Error fetching campaigns:', error);
        toast.error('Failed to load campaigns', {
          description: 'Please check your connection and try again.'
        });
        throw error;
      }
    },
    enabled: true,
    staleTime: 60000, // 1 minute
    gcTime: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useGetCampaign(campaignId: string) {
  return useQuery<Campaign | null>({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      try {
        console.log('=== Fetching campaign:', campaignId, '===');
        return await api.campaign(campaignId);
      } catch (error: any) {
        console.error('❌ Error fetching campaign:', error);
        throw error;
      }
    },
    enabled: !!campaignId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

export function useGetCampaignsByCreator(creatorWalletAddress: string | null) {
  return useQuery<Campaign[]>({
    queryKey: ['myCampaigns', creatorWalletAddress],
    queryFn: async () => {
      if (!creatorWalletAddress) return [];
      try {
        console.log('=== Fetching campaigns by creator:', creatorWalletAddress, '===');
        const campaigns = await api.campaignsByCreator(creatorWalletAddress);
        console.log('✓ Fetched user campaigns:', campaigns.length);
        return campaigns;
      } catch (error: any) {
        console.error('❌ Error fetching user campaigns:', error);
        throw error;
      }
    },
    enabled: !!creatorWalletAddress,
    staleTime: 0,
    refetchOnMount: false,
    gcTime: 0,
    retry: 2,
  });
}

export function useGetDonationsByCampaign(campaignId: string, options?: { refetchOnMount?: boolean; refetchOnWindowFocus?: boolean }) {
  return useQuery<Donation[]>({
    queryKey: ['donations', campaignId],
    queryFn: async () => {
      try {
        return await api.donationsByCampaign(campaignId);
      } catch (error: any) {
        console.error('❌ Error fetching donations:', error);
        throw error;
      }
    },
    enabled: !!campaignId,
    staleTime: 0,
    refetchOnMount: options?.refetchOnMount ?? true,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    retry: 2,
  });
}

export function useCreateCampaign() {
  const { getAccessToken } = usePrivyAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      description: string;
      goal: bigint;
      duration: bigint;
      imageUrl: string;
      thumbnailUrl: string;
      creatorWalletAddress: string;
      websiteUrl?: string | null;
      twitterUrl?: string | null;
      telegramUrl?: string | null;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Authentication required');
      // Validate Solana wallet address format (base58, 32-44 chars)
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
      if (!base58Regex.test(params.creatorWalletAddress)) {
        throw new Error('Invalid Solana wallet address: Non-base58 character or invalid length');
      }
      try {
        const result = await api.createCampaign({ ...params, goal: params.goal.toString(), duration: params.duration.toString() }, token);
        return result.id;
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaignSummaries'] });
      queryClient.invalidateQueries({ queryKey: ['myCampaigns'] });
      console.log('Campaign created, invalidating all campaign queries');
    },
    onError: (error: any) => {
      console.error('Failed to create campaign:', error);
      if (error.message?.includes('Non-base58') || error.message?.includes('Invalid Solana')) {
        toast.error('Invalid embedded wallet address. Please sign in again.');
      } else {
        toast.error('Failed to create campaign. Please try again.');
      }
    },
  });
}

export function useAddDonation() {
  const { getAccessToken } = usePrivyAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      mainTransactionSignature: string;
      feeTransactionSignature: string;
      amount: bigint;
      feeAmount: bigint;
      campaignId: string;
      donorWalletAddress: string;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Authentication required');
      try {
        await api.addDonation({ ...params, amount: params.amount.toString(), feeAmount: params.feeAmount.toString() }, token);
        console.log('Donation recorded in backend:', params);
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      // Optimistic updates for immediate UI feedback
      queryClient.setQueryData(['donations', variables.campaignId], (oldData: Donation[] | undefined) => {
        if (oldData) {
          const newDonation: Donation = {
            mainTransactionSignature: variables.mainTransactionSignature,
            feeTransactionSignature: variables.feeTransactionSignature,
            amount: variables.amount,
            feeAmount: variables.feeAmount,
            campaignId: variables.campaignId,
            donorWalletAddress: variables.donorWalletAddress,
            timestamp: BigInt(Date.now() * 1000000),
          };
          return [newDonation, ...oldData];
        }
        return oldData;
      });

      queryClient.invalidateQueries({ queryKey: ['myCampaigns'] });

      console.log('Donation added, updated queries optimistically');
    },
    onError: (error: any) => {
      console.error('Failed to record donation:', error);
      toast.error('Failed to record donation. Please try again.');
    },
  });
}
