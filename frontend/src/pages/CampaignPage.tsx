import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useGetCampaign, useGetDonationsByCampaign } from '../hooks/useQueries';
import { usePrivyAuth } from '../components/PrivyAuthProvider';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useSolanaDonation } from '@/hooks/useSolanaDonation';
import { usePrivyBalances } from '@/hooks/usePrivyBalances';
import { useAddDonation } from '../hooks/useQueries';
import { Clock, TrendingUp, Calendar, Globe, Send, ThumbsUp, Share2, Copy } from 'lucide-react';
import { formatUsdc } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

function getFunnyName(address: string) {
  const adjectives = ['Cosmic', 'Tiny', 'Lucky', 'Chaotic', 'Turbo', 'Sneaky', 'Mighty', 'Bouncy'];
  const nouns = ['Byte', 'Pickle', 'Wizard', 'Noodle', 'Rocket', 'Mango', 'Legend', 'Comet'];
  const seed = address.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
  return `${adjectives[seed % adjectives.length]} ${nouns[(seed * 7) % nouns.length]}`;
}

function getAvatarColor(address: string) {
  const colors = ['#4b54ff', '#e05d8f', '#e08b3e', '#36a269', '#8b62d9', '#2d9cdb'];
  const seed = address.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
  return colors[seed % colors.length];
}

function getNameInitials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function getStoredProfileName(walletAddress: string) {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem(`dropfund-profile-${walletAddress}`);
    if (!raw) return '';
    const parsed = JSON.parse(raw) as { name?: string };
    return typeof parsed.name === 'string' ? parsed.name.trim() : '';
  } catch {
    return '';
  }
}

export default function CampaignPage() {
  const { campaignId } = useParams({ from: '/campaign/$campaignId' });
  // Scroll to top on mount or when campaignId changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [campaignId]);
  const { data: campaign, isLoading: campaignLoading, isFetching: campaignFetching } = useGetCampaign(campaignId);
  const { data: donationsData, isLoading: donationsLoading } = useGetDonationsByCampaign(campaignId);
  const donations = donationsData || [];
  const { authenticated, solanaAddress, login } = usePrivyAuth();
  const { usdcBalance } = usePrivyBalances();
  console.log('[CampaignPage] Rendered. Privy wallet ready:', authenticated && !!solanaAddress);
  const [donationAmount, setDonationAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);
  const [networkFee, setNetworkFee] = useState<number | null>(null);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [mobileButtonHeight, setMobileButtonHeight] = useState<number | null>(null);
  const [mobileButtonWidth, setMobileButtonWidth] = useState<number | null>(null);
  const mobileDonateButtonRef = useRef<HTMLButtonElement | null>(null);
  const donateSentinelRef = useRef<HTMLDivElement | null>(null);
  const selfDonationWarningShownRef = useRef(false);
  const hasInitializedStatsRef = useRef(false);
  const statsAnimationRef = useRef<number | null>(null);
  const [donationSort, setDonationSort] = useState<'recent' | 'highest'>('recent');
  const [shareOpen, setShareOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [, forceProfileRefresh] = useState(0);
  const [animatedRaisedNumber, setAnimatedRaisedNumber] = useState(0);
  const [animatedProgressPercentage, setAnimatedProgressPercentage] = useState(0);
  const [animatedDonationCount, setAnimatedDonationCount] = useState(0);
  const { donate: donateUsdc, estimateFee, donationPhase } = useSolanaDonation();
  const addDonation = useAddDonation();
  const queryClient = useQueryClient();
  const goalNumber = campaign ? Number(campaign.goal) : 0;
  const raisedNumber = campaign ? donations.reduce((sum, d) => sum + Number(d.amount), 0) : 0;
  const progressPercentage = goalNumber > 0 ? (raisedNumber / goalNumber) * 100 : 0;
  const donationCount = donations.length;

  useEffect(() => {
    const amount = Number(donationAmount);
    if (!authenticated || !campaign || !Number.isFinite(amount) || amount <= 0) {
      setNetworkFee(null);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void estimateFee(amount, campaign.creatorWalletAddress)
        .then((fee) => {
          if (!cancelled) setNetworkFee(fee);
        })
        .catch(() => {
          if (!cancelled) setNetworkFee(null);
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [authenticated, campaign, donationAmount, estimateFee]);

  // Reset sticky measurements/state when navigating between campaigns
  useEffect(() => {
    setShowStickyCTA(false);
    setMobileButtonHeight(null);
    setMobileButtonWidth(null);
  }, [campaignId]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const refreshProfile = () => forceProfileRefresh((value) => value + 1);
    window.addEventListener('dropfund-profile-updated', refreshProfile);
    return () => window.removeEventListener('dropfund-profile-updated', refreshProfile);
  }, []);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    const timeout = window.setTimeout(() => {
      const sentinel = donateSentinelRef.current;
      if (!sentinel) return;
      const bottomMargin = (mobileButtonHeight ?? 48) + 16; // height plus bottom offset
      observer = new IntersectionObserver(
        ([entry]) => setShowStickyCTA(!entry.isIntersecting),
        { threshold: 0, rootMargin: `0px 0px -${bottomMargin}px 0px` }
      );
      observer.observe(sentinel);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
      if (observer) observer.disconnect();
    };
  }, [campaignId, campaignLoading, campaignFetching, donationsLoading, mobileButtonHeight]);

  // Measure button dimensions once for consistent sticky sizing and spacer height
  useEffect(() => {
    const btn = mobileDonateButtonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    if (!mobileButtonHeight) setMobileButtonHeight(rect.height);
    if (!mobileButtonWidth) setMobileButtonWidth(rect.width);
  }, [mobileButtonHeight, mobileButtonWidth, campaignId, campaignLoading, campaignFetching, donationsLoading]);

  useEffect(() => {
    if (!hasInitializedStatsRef.current) {
      setAnimatedRaisedNumber(raisedNumber);
      setAnimatedProgressPercentage(progressPercentage);
      setAnimatedDonationCount(donationCount);
      hasInitializedStatsRef.current = true;
      return;
    }

    if (statsAnimationRef.current !== null) {
      window.cancelAnimationFrame(statsAnimationRef.current);
    }

    const startRaised = animatedRaisedNumber;
    const startProgress = animatedProgressPercentage;
    const startCount = animatedDonationCount;
    const targetRaised = raisedNumber;
    const targetProgress = progressPercentage;
    const targetCount = donationCount;
    const durationMs = 700;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = Math.min((now - startTime) / durationMs, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);

      setAnimatedRaisedNumber(startRaised + (targetRaised - startRaised) * eased);
      setAnimatedProgressPercentage(startProgress + (targetProgress - startProgress) * eased);
      setAnimatedDonationCount(Math.round(startCount + (targetCount - startCount) * eased));

      if (elapsed < 1) {
        statsAnimationRef.current = window.requestAnimationFrame(tick);
      } else {
        setAnimatedRaisedNumber(targetRaised);
        setAnimatedProgressPercentage(targetProgress);
        setAnimatedDonationCount(targetCount);
        statsAnimationRef.current = null;
      }
    };

    statsAnimationRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (statsAnimationRef.current !== null) {
        window.cancelAnimationFrame(statsAnimationRef.current);
        statsAnimationRef.current = null;
      }
    };
  }, [raisedNumber, progressPercentage, donationCount, campaignId]);

  if (campaignLoading || campaignFetching || campaign === undefined) {
    return (
      <div className="container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (campaign === null) {
    return (
      <div className="container py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Campaign Not Found</h1>
          <p className="text-muted-foreground">The campaign you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const isEnded = campaign.status === 'ended';
  const isFunded = campaign.status === 'funded';
  const isGoalReachedStatus = campaign.status === 'goal_reached';
  const disableDonate = isEnded || isFunded;
  const isCampaignCreator = authenticated && !!solanaAddress && solanaAddress === campaign.creatorWalletAddress;
  const creatorDisplayName = getStoredProfileName(campaign.creatorWalletAddress) || getFunnyName(campaign.creatorWalletAddress);
  const donationValue = Number(donationAmount);
  const hasInsufficientBalance = authenticated && usdcBalance !== null && donationValue > usdcBalance;
  const isGoalReachedAmount = raisedNumber >= goalNumber;

  const sortedDonations = [...donations].sort((a, b) => {
    if (donationSort === 'highest') {
      return Number(b.amount) - Number(a.amount);
    }
    return Number(b.timestamp) - Number(a.timestamp);
  });

  const handleDonateClick = async () => {
    try {
      if (isCampaignCreator) {
        toast.error("You can't fund your own campaign.");
        return;
      }
      if (!authenticated || !solanaAddress) {
        login();
        return;
      }

      const amount = Number(donationAmount);
      if (!amount || amount <= 0) {
        toast.error('Enter a valid USDC amount first.');
        return;
      }
      setIsDonating(true);
      const result = await donateUsdc(campaignId, amount, campaign.creatorWalletAddress);
      await addDonation.mutateAsync({
        mainTransactionSignature: result.signature,
        feeTransactionSignature: '',
        amount: BigInt(Math.floor(result.amount * 1e6)),
        feeAmount: BigInt(Math.round(result.fee * 1e6)),
        campaignId,
        donorWalletAddress: solanaAddress,
      });
      const donationUnits = BigInt(Math.floor(result.amount * 1e6));
      const optimisticDonation = {
        mainTransactionSignature: result.signature,
        feeTransactionSignature: '',
        amount: donationUnits,
        feeAmount: BigInt(Math.round(result.fee * 1e6)),
        campaignId,
        donorWalletAddress: solanaAddress,
        timestamp: BigInt(Date.now() * 1e6),
      };
      queryClient.setQueryData(['donations', campaignId], (current: typeof donations) => {
        const existing = current || [];
        return existing.some((donation) => donation.mainTransactionSignature === result.signature)
          ? existing
          : [optimisticDonation, ...existing];
      });
      queryClient.setQueryData(['campaign', campaignId], (current: typeof campaign) => current ? {
        ...current,
        totalRaised: current.totalRaised + donationUnits,
        donationCount: current.donationCount + 1n,
      } : current);
      queryClient.setQueryData(['campaigns'], (current: any[] | undefined) => {
        if (!current) return current;
        return current.map((item) => {
          if (item.id !== campaignId) return item;
          return {
            ...item,
            totalRaised: item.totalRaised + donationUnits,
            donationCount: item.donationCount + 1n,
          };
        });
      });
      queryClient.setQueryData(['userDonations', solanaAddress], (current: any[] | undefined) => {
        const existing = current || [];
        return existing.some((donation) => donation.mainTransactionSignature === result.signature)
          ? existing
          : [optimisticDonation, ...existing];
      });
      setDonationAmount('');
      toast.success('USDC donation sent successfully.');
    } catch (error: any) {
      console.error('Connection error:', error);
      if (error?.message?.includes('User rejected') || error?.message?.includes('User cancelled')) {
        console.log('User cancelled connection');
      } else {
        toast.error('Failed to connect. Please try again.', {
          description: error?.message || 'Unknown error occurred',
        });
      }
    } finally {
      setIsDonating(false);
    }
  };

  const handleDonationAmountChange = (value: string) => {
    if (isCampaignCreator) {
      if (!selfDonationWarningShownRef.current) {
        toast.error("You can't fund your own campaign.");
        selfDonationWarningShownRef.current = true;
      }
      return;
    }
    setDonationAmount(value);
  };

  const getTimeRemaining = () => {
    if (!campaign.endTimestamp || Number(campaign.endTimestamp) <= 0) {
      return campaign.status === 'funded' ? 'Funded' : 'Until funded';
    }
    const now = Date.now() * 1000000;
    const remaining = Number(campaign.endTimestamp) - now;
    if (remaining <= 0) return 'Campaign ended';
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000000000));
    return `${days} days remaining`;
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="container py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
            <img
              src={campaign.imageUrl || '/assets/generated/campaign-placeholder.dim_400x300.jpg'}
              alt={campaign.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3">
              {isFunded ? (
                <Badge className="backdrop-blur-sm bg-gray-600 text-white border-0">Funded</Badge>
              ) : isEnded ? (
                <Badge className="backdrop-blur-sm bg-gray-600 text-white border-0">Ended</Badge>
              ) : isGoalReachedStatus || isGoalReachedAmount ? (
                <Badge className="backdrop-blur-sm bg-[#58d16e] text-black border-0">Goal Reached</Badge>
              ) : (
                <Badge className="backdrop-blur-sm bg-[#58d16e] text-black border-0">Active</Badge>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Avatar className="h-10 w-10" style={{ backgroundColor: campaign.creatorWalletAddress ? getAvatarColor(campaign.creatorWalletAddress) : '#4b54ff' }}>
                    <AvatarFallback className="bg-transparent text-xs text-white">
                      {campaign.creatorWalletAddress ? getNameInitials(creatorDisplayName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm font-semibold text-foreground">
                    {campaign.creatorWalletAddress ? creatorDisplayName : 'Unknown creator'}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border hover:bg-[#282b30]"
                    aria-label="Like"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-border hover:bg-[#282b30]"
                    aria-label="Share"
                    onClick={() => setShareOpen(true)}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-4xl font-bold">{campaign.title}</h1>
            </div>

            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <pre className="text-lg whitespace-pre-wrap break-words font-sans bg-transparent border-0 p-0 m-0">{campaign.description}</pre>
            </div>

            {((campaign.websiteUrl?.some((url) => url.trim().length > 0)) || 
              (campaign.twitterUrl?.some((url) => url.trim().length > 0)) || 
              (campaign.telegramUrl?.some((url) => url.trim().length > 0))) && (
              <div className="flex flex-wrap gap-3 pt-4">
                {campaign.websiteUrl?.some((url) => url.trim().length > 0) && (
                  <Button asChild variant="outline" size="sm" className="bg-[#282b30] border-[#282b30] hover:bg-[#282b30] text-[#7a8189] hover:text-white">
                    <a href={campaign.websiteUrl[0]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website
                    </a>
                  </Button>
                )}
                {campaign.twitterUrl?.some((url) => url.trim().length > 0) && (
                  <Button asChild variant="outline" size="sm" className="bg-[#282b30] border-[#282b30] hover:bg-[#282b30] text-[#7a8189] hover:text-white">
                    <a href={campaign.twitterUrl[0]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        aria-label="X"
                        fill="currentColor"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Twitter
                    </a>
                  </Button>
                )}
                {campaign.telegramUrl?.some((url) => url.trim().length > 0) && (
                  <Button asChild variant="outline" size="sm" className="bg-[#282b30] border-[#282b30] hover:bg-[#282b30] text-[#7a8189] hover:text-white">
                    <a href={campaign.telegramUrl[0]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Telegram
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Mobile: Show funding card after description */}
          <div className="lg:hidden">
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Raised</span>
                      <span className="font-bold text-lg">${formatUsdc(animatedRaisedNumber / 1000000)} USDC</span>
                    </div>
                    <Progress value={animatedProgressPercentage} className="h-3 [&>div]:bg-[#58d16e]" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Goal: ${formatUsdc(goalNumber / 1000000)} USDC</span>
                      <span className="font-semibold" style={{ color: '#58d16e' }}>{animatedProgressPercentage.toFixed(0)}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <TrendingUp className="h-4 w-4" />
                        <span>Donations</span>
                      </div>
                      <div className="text-2xl font-bold">{animatedDonationCount}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Clock className="h-4 w-4" />
                        <span>Time Left</span>
                      </div>
                      <div className="text-lg font-semibold">{getTimeRemaining()}</div>
                    </div>
                  </div>

                  <div className="pt-4 border-t space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Calendar className="h-4 w-4" />
                      <span>Created</span>
                    </div>
                    <div className="text-sm">{formatDate(campaign.createdAt)}</div>
                  </div>

                  <div className="relative">
                    <div ref={donateSentinelRef} className="h-1 w-full" />
                    {showStickyCTA && mobileButtonHeight && <div style={{ height: mobileButtonHeight }} />}
                    {!disableDonate && <div className="mb-3 flex items-center rounded-xl border border-[#282b30] bg-[#282b30] px-4 py-3">
                      <span className="mr-2 text-2xl text-white/45">$</span>
                      <input value={donationAmount} onChange={(event) => handleDonationAmountChange(event.target.value)} inputMode="decimal" type="text" placeholder="Enter amount" disabled={isDonating || isCampaignCreator} className="min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/35" aria-label="Donation amount in USDC" />
                      {authenticated && usdcBalance !== null && <span className={`ml-3 shrink-0 text-right text-sm ${hasInsufficientBalance ? 'text-[#ff641f]' : 'text-white/55'}`}>{hasInsufficientBalance ? 'Insufficient balance' : networkFee !== null ? `$${networkFee.toFixed(6)} network fee` : `$${(Math.floor(usdcBalance * 100) / 100).toFixed(2)} available`}</span>}
                    </div>}
                    <Button
                      ref={mobileDonateButtonRef}
                    className={`h-[3.2rem] text-lg font-semibold ${
                      showStickyCTA
                        ? 'fixed left-1/2 -translate-x-1/2 bottom-4 z-50 pointer-events-auto'
                        : 'w-full'
                    }`}
                      style={
                        showStickyCTA && mobileButtonWidth
                          ? { width: `${mobileButtonWidth}px` }
                          : undefined
                      }
                      size="lg"
                      disabled={disableDonate || isDonating || !donationAmount || hasInsufficientBalance || isCampaignCreator}
                      onClick={handleDonateClick}
                    >
                      {disableDonate
                        ? 'Campaign Ended'
                        : isCampaignCreator
                          ? "Creators can't fund"
                        : !authenticated || !solanaAddress
                          ? 'Login to Donate'
                          : isGoalReachedStatus || isGoalReachedAmount
                            ? 'Goal Reached (Still Accepting)'
                            : isDonating
                              ? donationPhase === 'preparing'
                                ? 'Preparing...'
                                : donationPhase === 'awaiting_signature'
                                  ? 'Confirm in wallet...'
                                  : donationPhase === 'submitting'
                                    ? 'Sending...'
                                    : 'Confirming...'
                              : 'Fund It'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Donation history (mobile/tablet) */}
          <div className="lg:hidden">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[1.2rem] font-bold">Donations</h2>
              <div className="flex items-center gap-2">
                <button
                  className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${donationSort === 'recent' ? 'bg-[#282b30] text-primary-foreground border-[#282b30]' : 'border-border text-muted-foreground'}`}
                  onClick={() => setDonationSort('recent')}
                  aria-label="Sort by most recent"
                >
                  <Clock className="h-3 w-3" />
                  Recent
                </button>
                <button
                  className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${donationSort === 'highest' ? 'bg-[#282b30] text-primary-foreground border-[#282b30]' : 'border-border text-muted-foreground'}`}
                  onClick={() => setDonationSort('highest')}
                  aria-label="Sort by highest donation"
                >
                  <TrendingUp className="h-3 w-3" />
                  Highest
                </button>
              </div>
            </div>
            {donationsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : sortedDonations && sortedDonations.length > 0 ? (
              <div className="space-y-3 max-h-[22rem] overflow-y-auto">
                {sortedDonations.map((donation) => (
                  <div
                    key={donation.mainTransactionSignature}
                    className="flex items-center justify-between p-4 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar style={{ backgroundColor: donation.donorWalletAddress ? getAvatarColor(donation.donorWalletAddress) : '#4b54ff' }}>
                        <AvatarFallback className="bg-transparent text-xs text-white">
                          {donation.donorWalletAddress ? getNameInitials(getFunnyName(donation.donorWalletAddress)) : 'AN'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-1">
                          {donation.donorWalletAddress ? getFunnyName(donation.donorWalletAddress) : 'Unknown donor'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(donation.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                            <div className="font-bold">${formatUsdc(Number(donation.amount) / 1000000)} USDC</div>
                      <div className="text-xs text-muted-foreground">
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No donations yet. Be the first!</p>
            )}
          </div>
        </div>

        {/* Desktop: Show funding card in sidebar */}
        <div className="hidden lg:flex sticky top-12 h-[calc(100vh-5rem)] flex-col space-y-6 overflow-hidden">
          <Card className="shrink-0">
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Raised</span>
                    <span className="font-bold text-lg">${formatUsdc(animatedRaisedNumber / 1000000)} USDC</span>
                  </div>
                  <Progress value={animatedProgressPercentage} className="h-3 [&>div]:bg-[#58d16e]" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Goal: ${formatUsdc(goalNumber / 1000000)} USDC</span>
                    <span className="font-semibold" style={{ color: '#58d16e' }}>{animatedProgressPercentage.toFixed(0)}%</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <TrendingUp className="h-4 w-4" />
                        <span>Donations</span>
                      </div>
                      <div className="text-2xl font-bold">{animatedDonationCount}</div>
                    </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Clock className="h-4 w-4" />
                      <span>Time Left</span>
                    </div>
                    <div className="text-lg font-semibold">{getTimeRemaining()}</div>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Created</span>
                  </div>
                  <div className="text-sm">{formatDate(campaign.createdAt)}</div>
                </div>
              </div>

                {!disableDonate && <div className="mb-3 flex items-center rounded-xl border border-[#282b30] bg-[#282b30] px-4 py-3">
                  <span className="mr-2 text-2xl text-white/45">$</span>
                  <input value={donationAmount} onChange={(event) => handleDonationAmountChange(event.target.value)} inputMode="decimal" type="text" placeholder="Enter amount" disabled={isDonating || isCampaignCreator} className="min-w-0 flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-white/35" aria-label="Donation amount in USDC" />
                  {authenticated && usdcBalance !== null && <span className={`ml-3 shrink-0 text-right text-sm ${hasInsufficientBalance ? 'text-[#ff641f]' : 'text-white/55'}`}>{hasInsufficientBalance ? 'Insufficient balance' : networkFee !== null ? `$${networkFee.toFixed(6)} network fee` : `$${(Math.floor(usdcBalance * 100) / 100).toFixed(2)} available`}</span>}
                </div>}
                <Button
                  className="h-[3.2rem] w-full text-lg font-semibold"
                  size="lg"
                  disabled={disableDonate || isDonating || !donationAmount || hasInsufficientBalance || isCampaignCreator}
                  onClick={handleDonateClick}
                >
                  {disableDonate
                    ? 'Campaign Ended'
                    : isCampaignCreator
                      ? "Creators can't fund"
                    : !authenticated || !solanaAddress
                      ? 'Login to Donate'
                      : isGoalReachedStatus || isGoalReachedAmount
                        ? 'Goal Reached (Still Accepting)'
                        : isDonating
                          ? donationPhase === 'preparing'
                            ? 'Preparing...'
                            : donationPhase === 'awaiting_signature'
                              ? 'Confirm in wallet...'
                              : donationPhase === 'submitting'
                                ? 'Sending...'
                                : 'Confirming...'
                          : 'Fund It'}
                </Button>
            </CardContent>
          </Card>

          <Card className="flex-1 min-h-0 overflow-hidden bg-transparent shadow-none border-0">
            <CardContent className="pt-0 pb-0 h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <h2 className="text-[1.2rem] font-bold">Donations</h2>
                <div className="flex items-center gap-2">
                  <button
                    className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${donationSort === 'recent' ? 'bg-[#282b30] text-primary-foreground border-[#282b30]' : 'border-border text-muted-foreground'}`}
                    onClick={() => setDonationSort('recent')}
                    aria-label="Sort by most recent"
                  >
                    <Clock className="h-3 w-3" />
                    Recent
                  </button>
                  <button
                    className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs ${donationSort === 'highest' ? 'bg-[#282b30] text-primary-foreground border-[#282b30]' : 'border-border text-muted-foreground'}`}
                    onClick={() => setDonationSort('highest')}
                    aria-label="Sort by highest donation"
                  >
                    <TrendingUp className="h-3 w-3" />
                    Highest
                  </button>
              </div>
            </div>
              <div className="flex-1 overflow-y-auto max-h-[22rem] pb-0">
                {donationsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : sortedDonations && sortedDonations.length > 0 ? (
                <div className="space-y-3">
                  {sortedDonations.map((donation) => (
                      <div
                        key={donation.mainTransactionSignature}
                        className="flex items-center justify-between py-4 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar style={{ backgroundColor: donation.donorWalletAddress ? getAvatarColor(donation.donorWalletAddress) : '#4b54ff' }}>
                            <AvatarFallback className="bg-transparent text-xs text-white">
                              {donation.donorWalletAddress ? getNameInitials(getFunnyName(donation.donorWalletAddress)) : 'AN'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                        <div className="font-medium text-sm flex items-center gap-1">
                              {donation.donorWalletAddress ? getFunnyName(donation.donorWalletAddress) : 'Unknown donor'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDate(donation.timestamp)}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">${formatUsdc(Number(donation.amount) / 1000000)} USDC</div>
                          <div className="text-xs text-muted-foreground">
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No donations yet. Be the first!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>


      {campaign && isMobile && ReactDOM.createPortal(
        <>
          <div
            className={`fixed inset-0 bg-black/50 transition-opacity duration-200 z-[9999] ${
              shareOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setShareOpen(false)}
          />
          <div
            className={`fixed inset-0 z-[10000] flex items-end justify-center pb-6 transition-all duration-200 ${
              shareOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
            onClick={() => setShareOpen(false)}
          >
            <div
              className="w-[90%] max-w-sm space-y-3 p-4 rounded-xl shadow-2xl text-base text-left"
              style={{ backgroundColor: '#1d1e1f' }}
              role="dialog"
              aria-modal="true"
              aria-label="Share campaign"
              onClick={(e) => e.stopPropagation()}
            >
              <VisuallyHidden>Share Campaign</VisuallyHidden>
              <Button
                type="button"
                className="w-full justify-center"
                onClick={async () => {
                  try {
                    const url = `${window.location.origin}/campaign/${campaignId}`;
                    await navigator.clipboard.writeText(url);
                    toast.success('Link copied');
                    setShareOpen(false);
                  } catch {
                    toast.error('Failed to copy link');
                  }
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center bg-white text-black hover:bg-white/90"
                asChild
              >
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `Check out this campaign: ${campaign.title}`
                  )}&url=${encodeURIComponent(`${window.location.origin}/campaign/${campaignId}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 mr-2"
                    aria-label="X"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Share on X
                </a>
              </Button>
            </div>
          </div>
        </>,
        document.body
      )}

      {campaign && !isMobile && (
        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-card">
            <DialogHeader>
              <DialogTitle className="text-2xl px-6 pt-6">Share Campaign</DialogTitle>
              <DialogDescription className="sr-only">
                Share this campaign via link or Twitter
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 px-6 pb-6">
              <div className="overflow-hidden rounded-2xl">
                <div className="w-full aspect-video">
                  <img
                    src={campaign.imageUrl || '/assets/generated/campaign-placeholder.dim_400x300.jpg'}
                    alt={campaign.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-bold text-xl break-words">{campaign.title}</div>
                <div className="text-base text-muted-foreground line-clamp-2">
                  {campaign.description || "Let's launch a campaign!"}
                </div>
              </div>
              <div className="space-y-3">
                <Button
                  type="button"
                  className="w-full justify-center"
                  onClick={async () => {
                    try {
                      const url = `${window.location.origin}/campaign/${campaignId}`;
                      await navigator.clipboard.writeText(url);
                      toast.success('Link copied');
                    } catch {
                      toast.error('Failed to copy link');
                    }
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-center bg-white text-black hover:bg-white/90"
                  asChild
                >
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                      `Check out this campaign: ${campaign.title}`
                    )}&url=${encodeURIComponent(`${window.location.origin}/campaign/${campaignId}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-4 w-4 mr-2"
                      aria-label="X"
                      fill="currentColor"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Share on X
                  </a>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
