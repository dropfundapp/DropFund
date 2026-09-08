import { useState } from 'react';
import { useGetCampaigns } from '../hooks/useQueries';
import CampaignCard from '../components/CampaignCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { Clock, AlertCircle, RefreshCw, Loader2, Search, Star, Rocket, ArrowUp, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import '../override-accent.css';
import { useQueryClient } from '@tanstack/react-query';

export default function HomePage() {
  const { data: campaigns, isLoading, error, refetch, isRefetching } = useGetCampaigns();
  const [sortBy, setSortBy] = useState<'featured' | 'last-funded' | 'just-launched' | 'highest-goal' | 'top-gainers'>('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const handleSortChange = (value: string) => {
    const scrollY = window.scrollY;
    setSortBy(value as any);
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  };

  // ...

  const handleRetry = () => {
    toast.promise(refetch(), {
      loading: 'Loading campaigns...',
      success: (data) => `Loaded ${data.data?.length || 0} campaigns`,
      error: 'Failed to load campaigns',
    });
  };

  // Category keywords mapping
  const categoryKeywords: Record<string, string[]> = {
    'Technology': ['tech', 'app', 'software', 'ai', 'blockchain', 'crypto', 'web3', 'code', 'digital', 'technology'],
    'Health & Wellness': ['health', 'medical', 'fitness', 'wellness', 'hospital', 'therapy', 'mental health'],
    'Education': ['education', 'school', 'student', 'learning', 'course', 'training', 'scholarship'],
    'Creative Arts': ['art', 'music', 'film', 'creative', 'artist', 'album', 'movie', 'design', 'paint', 'arts'],
    'Community': ['community', 'local', 'charity', 'nonprofit', 'social', 'volunteer', 'help'],
    'Environment': ['environment', 'climate', 'green', 'sustainable', 'eco', 'planet', 'nature', 'renewable'],
    'Business': ['business', 'startup', 'entrepreneur', 'company', 'product', 'launch', 'venture'],
    'Sports': ['sport', 'team', 'athlete', 'fitness', 'game', 'tournament', 'competition', 'sports'],
  };

  // Check if search query matches a category
  const getCategoryFromSearch = (query: string): string | null => {
    const lowerQuery = query.toLowerCase();
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (category.toLowerCase() === lowerQuery || keywords.some(k => lowerQuery.includes(k) || k.includes(lowerQuery))) {
        return category;
      }
    }
    return null;
  };

  const filteredAndSortedCampaigns = campaigns
    ? [...campaigns]
        .filter((campaign) => {
          if (!searchQuery.trim()) return true;
          const query = searchQuery.toLowerCase();
          
          // Check if query matches a category
          const matchedCategory = getCategoryFromSearch(query);
          if (matchedCategory) {
            return campaign.category === matchedCategory;
          }
          
          // Otherwise do regular text search
          return (
            campaign.title.toLowerCase().includes(query) ||
            (campaign.category && campaign.category.toLowerCase().includes(query))
          );
        })
        .sort((a, b) => {
          switch (sortBy) {
            case 'featured':
              // Featured: campaigns with more social links
              const countSocials = (c: any) => [c.websiteUrl, c.twitterUrl, c.telegramUrl]
                .reduce((sum, v) => sum + (Array.isArray(v) && v.length > 0 ? 1 : 0), 0);
              const aSocials = countSocials(a);
              const bSocials = countSocials(b);
              return bSocials - aSocials;
            case 'last-funded':
              // Last Funded: sort by most recent donation timestamp (BigInt-safe)
              const getTs = (d: any) => {
                try {
                  if (typeof d.timestamp === 'bigint') return d.timestamp as bigint;
                  if (typeof d.timestamp === 'number') return BigInt(Math.floor(d.timestamp));
                  return BigInt(Number(d.timestamp || 0));
                } catch {
                  return 0n;
                }
              };

              const aDonations = (queryClient.getQueryData(['donations', a.id]) as any[]) || [];
              const bDonations = (queryClient.getQueryData(['donations', b.id]) as any[]) || [];

              const aLast = aDonations.length > 0
                ? aDonations.reduce((max: bigint, d: any) => {
                    const t = getTs(d);
                    return t > max ? t : max;
                  }, 0n)
                : 0n;

              const bLast = bDonations.length > 0
                ? bDonations.reduce((max: bigint, d: any) => {
                    const t = getTs(d);
                    return t > max ? t : max;
                  }, 0n)
                : 0n;

              // If neither has donations, treat them as unfunded and place
              // unfunded campaigns after funded ones. For two unfunded campaigns
              // order by createdAt with older campaigns before newer ones so
              // freshly-created campaigns don't jump to the top of "last-funded".
              const bothEmpty = aLast === 0n && bLast === 0n;
              if (bothEmpty) {
                const getCreated = (c: any) => {
                  try {
                    if (typeof c.createdAt === 'bigint') return c.createdAt as bigint;
                    if (typeof c.createdAt === 'number') return BigInt(Math.floor(c.createdAt));
                    return BigInt(Number(c.createdAt || 0));
                  } catch { return 0n; }
                };

                const aCreated = getCreated(a);
                const bCreated = getCreated(b);

                // older campaigns (smaller createdAt) should come first
                if (aCreated === bCreated) return 0;
                return aCreated < bCreated ? -1 : 1;
              }

              if (bLast > aLast) return 1; // b newer -> b first
              if (bLast < aLast) return -1;
              return 0;
            case 'just-launched':
              // Just Launched: newest campaigns
              return Number(b.createdAt) - Number(a.createdAt);
            case 'highest-goal':
              // Highest Goal: campaigns with highest funding goals
              return Number(b.goal) - Number(a.goal);
            case 'top-gainers':
              // Top Gainers: highest percentage of goal reached
              const aPercent = Number(a.totalRaised) / Number(a.goal);
              const bPercent = Number(b.totalRaised) / Number(b.goal);
              return bPercent - aPercent;
            default:
              return 0;
          }
        })
    : [];

  return (
    <div className="py-12">
      <div className="container">
        {/* Hero Section */}
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-5xl md:font-bold mb-4 text-white md:leading-none" style={{ fontSize: 'clamp(3rem, 10vw, 8rem)' }}>
            Fund anything onchain
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Support people, ideas, and causes with transparent, verified USDC donations on Solana.
          </p>
        </div>
      </div>

      {/* Desktop Layout: Search Bar + Filters */}
      <div className="hidden md:block sticky top-0 z-50 bg-background py-4">
        <div className="container">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 rounded-full bg-[#282b30] focus-visible:border-[#4b54ff] focus-visible:ring-[#4b54ff]"
              />
            </div>
            <Tabs value={sortBy} onValueChange={handleSortChange}>
              <TabsList className="bg-[#282b30]">
                <TabsTrigger value="featured" className="gap-2 filter-btn">
                  <Star className="h-4 w-4" />
                  Featured
                </TabsTrigger>
                <TabsTrigger value="last-funded" className="gap-2 filter-btn">
                  <Clock className="h-4 w-4" />
                  Last Funded
                </TabsTrigger>
                <TabsTrigger value="just-launched" className="gap-2 filter-btn">
                  <Rocket className="h-4 w-4" />
                  Just Launched
                </TabsTrigger>
                <TabsTrigger value="highest-goal" className="gap-2 filter-btn">
                  <ArrowUp className="h-4 w-4" />
                  Highest Goal
                </TabsTrigger>
                <TabsTrigger value="top-gainers" className="gap-2 filter-btn">
                  <Zap className="h-4 w-4" />
                  Top Gainers
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Mobile Layout: Search Bar + Filters */}
      <div className="md:hidden sticky top-0 z-50 bg-background py-4">
        <div className="container">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 rounded-full bg-[#282b30] focus-visible:border-[#4b54ff] focus-visible:ring-[#4b54ff]"
              />
            </div>
            <div className="overflow-x-auto scrollbar-hide w-full min-w-0">
              <Tabs value={sortBy} onValueChange={handleSortChange}>
                <TabsList className="inline-flex w-full bg-[#282b30] pl-0 pr-0 m-0" style={{ justifyContent: 'flex-start' }}>
                  <TabsTrigger 
                value="featured" 
                className="gap-2 whitespace-nowrap flex-shrink-0 filter-btn"
                onClick={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget;
                  setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }, 0);
                }}
              >
                    <Star className="h-4 w-4" />
                    Featured
                  </TabsTrigger>
                  <TabsTrigger 
                value="last-funded" 
                className="gap-2 whitespace-nowrap flex-shrink-0 filter-btn"
                onClick={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget;
                  setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }, 0);
                }}
              >
                    <Clock className="h-4 w-4" />
                    Last Funded
                  </TabsTrigger>
                  <TabsTrigger 
                value="just-launched" 
                className="gap-2 whitespace-nowrap flex-shrink-0 filter-btn"
                onClick={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget;
                  setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }, 0);
                }}
              >
                    <Rocket className="h-4 w-4" />
                    Just Launched
                  </TabsTrigger>
                  <TabsTrigger 
                value="highest-goal" 
                className="gap-2 whitespace-nowrap flex-shrink-0 filter-btn"
                onClick={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget;
                  setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }, 0);
                }}
              >
                    <ArrowUp className="h-4 w-4" />
                    Highest Goal
                  </TabsTrigger>
                  <TabsTrigger 
                value="top-gainers" 
                className="gap-2 whitespace-nowrap flex-shrink-0 filter-btn"
                onClick={(e) => {
                  e.preventDefault();
                  const target = e.currentTarget;
                  setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }, 0);
                }}
              >
                    <Zap className="h-4 w-4" />
                    Top Gainers
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {error ? (
          <Alert variant="destructive" className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Campaigns</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span>Failed to load campaigns. Please try again.</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                disabled={isRefetching}
                className="w-full sm:w-auto"
              >
                {isRefetching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : isLoading || isRefetching || campaigns === undefined ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="aspect-video w-full bg-muted animate-pulse rounded-lg" />
                <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
                <div className="h-10 w-full bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : (Array.isArray(filteredAndSortedCampaigns) && filteredAndSortedCampaigns.length > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
        ) : (Array.isArray(filteredAndSortedCampaigns) && filteredAndSortedCampaigns.length === 0 && !isLoading && !isRefetching) ? (
          <div className="text-center py-20 space-y-4">
            <div className="mb-4 flex items-center justify-center">
              <span className="rounded-full p-4" style={{ background: '#282b30' }}>
                <Rocket className="h-12 w-12" style={{ color: 'var(--muted-foreground)' }} />
              </span>
            </div>
            <p className="text-xl text-muted-foreground mb-4">
              {searchQuery ? `No campaigns found matching "${searchQuery}"` : 'No campaigns yet. Be the first to create one!'}
            </p>
            {!searchQuery && <p className="text-sm text-muted-foreground">Connect your wallet to start creating campaigns</p>}
            {searchQuery && (
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
