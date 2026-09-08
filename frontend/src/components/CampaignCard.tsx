import type { CampaignSummary } from '../types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Link } from '@tanstack/react-router';
import { Clock, TrendingUp, Globe, MessageCircle } from 'lucide-react';
import { formatUsdc } from '@/lib/utils';

interface CampaignCardProps {
  campaign: CampaignSummary;
}

const categoryColors: Record<string, string> = {
  'Technology': 'bg-[#282b30] text-blue-500',
  'Health & Wellness': 'bg-[#282b30] text-green-500',
  'Education': 'bg-[#282b30] text-purple-500',
  'Creative Arts': 'bg-[#282b30] text-pink-500',
  'Community': 'bg-[#282b30] text-orange-500',
  'Environment': 'bg-[#282b30] text-emerald-500',
  'Business': 'bg-[#282b30] text-indigo-500',
  'Sports': 'bg-[#282b30] text-red-500',
};

export default function CampaignCard({ campaign }: CampaignCardProps) {
  // Use data from CampaignSummary instead of fetching donations separately for performance
  const donationCount = Number(campaign.donationCount);
  const totalRaised = Number(campaign.totalRaised);
  const goalNumber = Number(campaign.goal);
  const raisedNumber = totalRaised;
  const progressPercentage = goalNumber > 0 ? (raisedNumber / goalNumber) * 100 : 0;

  const isEnded = campaign.status === 'ended';
  const isFunded = campaign.status === 'funded';
  const isGoalReachedStatus = campaign.status === 'goal_reached';
  const isGoalReached = raisedNumber >= goalNumber;
  const avatarColors = ['#4b54ff', '#e05d8f', '#e08b3e', '#36a269', '#8b62d9', '#2d9cdb'];
  const avatarSeed = campaign.creatorWalletAddress.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
  const avatarColor = avatarColors[avatarSeed % avatarColors.length];
  const avatarInitials = campaign.creatorWalletAddress.slice(0, 2).toUpperCase();

  const getTimeRemaining = () => {
    if (!campaign.endTimestamp || Number(campaign.endTimestamp) <= 0) {
      return campaign.status === 'funded' ? 'Funded' : 'Until funded';
    }
    const now = Date.now() * 1000000;
    const remaining = Number(campaign.endTimestamp) - now;
    if (remaining <= 0) return 'Ended';
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000000000));
    return `${days} days left`;
  };

  const getCategoryColor = (category: string) => {
    return categoryColors[category] || 'bg-[#282b30] text-gray-200';
  };

  const socials = [
    { url: campaign.twitterUrl, icon: (props: any) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={props.className || "h-4 w-4"}
        aria-label="X"
        fill="currentColor"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ), label: 'Twitter' },
    { url: campaign.websiteUrl, icon: Globe, label: 'Website' },
    { url: campaign.telegramUrl, icon: MessageCircle, label: 'Telegram' },
  ].filter(social => social.url && social.url.length > 0);

  return (
    <Link to="/campaign/$campaignId" params={{ campaignId: campaign.id }} className="block">
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/50 group cursor-pointer h-full">
        <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          src={campaign.thumbnailUrl?.[0] || '/assets/generated/campaign-placeholder.dim_400x300.jpg'}
          alt={campaign.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3">
          {isFunded ? (
            <Badge className="backdrop-blur-sm bg-gray-600 text-white border-0">Funded</Badge>
          ) : isEnded ? (
            <Badge className="backdrop-blur-sm bg-gray-600 text-white border-0">Ended</Badge>
          ) : isGoalReachedStatus || isGoalReached ? (
            <Badge className="backdrop-blur-sm bg-[#58d16e] text-black border-0">Goal Reached</Badge>
          ) : (
            <Badge className="backdrop-blur-sm bg-[#58d16e] text-black border-0">Active</Badge>
          )}
        </div>
      </div>

      <CardHeader className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: avatarColor }}>
            {avatarInitials}
          </span>
          <h3 className="text-xl font-bold line-clamp-2">
            {campaign.title}
          </h3>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Raised</span>
            <span className="font-semibold">${formatUsdc(raisedNumber / 1000000)} USDC</span>
          </div>
          <Progress value={progressPercentage} className="h-2 [&>div]:bg-[#58d16e]" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Goal: ${formatUsdc(goalNumber / 1000000)} USDC</span>
            <span className="font-semibold" style={{ color: '#58d16e' }}>{progressPercentage.toFixed(0)}%</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{getTimeRemaining()}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>{donationCount} donations</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {campaign.category && campaign.category !== 'Other' ? (
            <Badge className={`text-xs ${getCategoryColor(campaign.category)} border-0`}>
              {campaign.category}
            </Badge>
          ) : (
            <div />
          )}
          
          {socials.length > 0 && (
            <div className="flex items-center gap-2" onClick={e => e.preventDefault()}>
              {socials.map((social, index) => (
                <button
                  key={index}
                  type="button"
                  className="text-muted-foreground hover:text-white transition-colors bg-transparent border-0 p-0 m-0 cursor-pointer"
                  aria-label={social.label}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(social.url[0], '_blank', 'noopener,noreferrer');
                  }}
                >
                  <social.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </Link>
  );
}
