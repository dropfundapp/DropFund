import { Link } from '@tanstack/react-router';
import { Rocket, Send } from 'lucide-react';
import { useState } from 'react';
import type { Campaign, CampaignComment, Donation } from '@/types';
import { formatUsdc } from '@/lib/utils';
import { useAddCampaignComment, useGetCampaignComments, useGetDiscoveryFeed } from '@/hooks/useQueries';
import { Button } from '@/components/ui/button';

interface CampaignActivityFeedProps {
  campaign: Campaign;
  donations: Donation[];
  donationsLoading: boolean;
  authenticated: boolean;
  walletAddress: string | null;
  onLogin: () => void;
  fillHeight?: boolean;
}

function displayTime(timestamp: bigint) {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - Number(timestamp / 1_000_000n)) / 1_000));
  if (elapsedSeconds < 60) return 'now';
  if (elapsedSeconds < 60 * 60) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 24 * 60 * 60) return `${Math.floor(elapsedSeconds / (60 * 60))}h ago`;
  if (elapsedSeconds < 7 * 24 * 60 * 60) return `${Math.floor(elapsedSeconds / (24 * 60 * 60))}d ago`;
  return `${Math.floor(elapsedSeconds / (7 * 24 * 60 * 60))}w ago`;
}

function linkifyText(text: string) {
  return text.split(/(https:\/\/[^\s<>"']+)/g).map((part, index) => {
    if (!/^https:\/\//.test(part)) return part;
    return <a key={`${part}-${index}`} href={part} target="_blank" rel="noopener noreferrer" className="text-[#4b54ff] underline underline-offset-2 hover:text-[#7880ff]">{part}</a>;
  });
}

export default function CampaignActivityFeed({ campaign, donations, donationsLoading, authenticated, walletAddress, onLogin, fillHeight = false }: CampaignActivityFeedProps) {
  const [tab, setTab] = useState<'campaign' | 'discovery'>('campaign');
  const [comment, setComment] = useState('');
  const commentsQuery = useGetCampaignComments(campaign.id);
  const discoveryQuery = useGetDiscoveryFeed();
  const addComment = useAddCampaignComment();
  const isCreator = walletAddress === campaign.creatorWalletAddress;
  const isDonor = !!walletAddress && donations.some((donation) => donation.donorWalletAddress === walletAddress);
  const canComment = isCreator || isDonor;

  const postComment = async () => {
    if (!walletAddress) {
      onLogin();
      return;
    }
    const body = comment.trim();
    if (!body) return;
    try {
      await addComment.mutateAsync({ campaignId: campaign.id, authorWalletAddress: walletAddress, body });
      setComment('');
    } catch (error) {
      console.error('Failed to add campaign comment:', error);
    }
  };

  const campaignItems = [
    ...donations.map((donation) => ({ type: 'donation' as const, timestamp: donation.timestamp, donation })),
    ...(commentsQuery.data || []).map((campaignComment) => ({ type: 'comment' as const, timestamp: campaignComment.timestamp, comment: campaignComment })),
  ].sort((left, right) => Number(right.timestamp - left.timestamp));

  return (
    <section className={fillHeight ? 'flex h-full min-h-0 flex-col overflow-hidden rounded-lg border-[1px] !border-[#181819]' : 'overflow-hidden rounded-lg border-[1px] !border-[#181819]'}>
      <div className="flex items-center gap-1 bg-[#181819] px-3">
        <button type="button" onClick={() => setTab('campaign')} className={`flex h-10 items-center px-3 text-sm font-medium ${tab === 'campaign' ? 'text-white' : 'text-white/45 hover:text-white'}`}>
          Campaign feed
        </button>
        <button type="button" onClick={() => setTab('discovery')} className={`flex h-10 items-center px-3 text-sm font-medium ${tab === 'discovery' ? 'text-white' : 'text-white/45 hover:text-white'}`}>
          Discover
        </button>
      </div>

      <div className={`px-3 pt-3 ${fillHeight ? 'flex min-h-0 flex-1 flex-col' : ''}`}>
        {tab === 'campaign' ? (
        <>
          {canComment ? (
            <div className="mb-4 flex h-12 items-center gap-2 rounded-full border border-[#3a3d43] bg-[#181819] py-0 pl-4 pr-2 transition-colors focus-within:border-[#4b54ff]">
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={500}
                rows={1}
                placeholder={isCreator ? 'Write an update...' : 'Write a message...'}
                className="min-w-0 flex-1 resize-none bg-transparent py-3 text-sm leading-5 text-white outline-none placeholder:text-white/50"
              />
              {comment.trim() ? <Button type="button" size="icon" aria-label="Post comment" className="dropfund-success-check h-9 w-9 shrink-0 rounded-full bg-[#4b54ff] text-white hover:bg-[#4149e6]" disabled={addComment.isPending} onClick={postComment}>
                <Send className="h-4 w-4" />
              </Button> : null}
            </div>
          ) : authenticated ? <p className="mb-4 text-sm text-white/45">Fund this campaign to join the conversation.</p> : null}
          {donationsLoading || (commentsQuery.isLoading && !commentsQuery.data) ? <p className="py-8 text-center text-sm text-white/45">Loading activity...</p> : campaignItems.length ? (
          <div className={fillHeight ? 'min-h-0 flex-1 space-y-5 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.3)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/30 hover:[&::-webkit-scrollbar-thumb]:bg-white/50' : 'max-h-[24rem] space-y-5 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.3)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/30 hover:[&::-webkit-scrollbar-thumb]:bg-white/50'}>
            {campaignItems.map((item) => item.type === 'donation' ? (
              <DonationItem key={item.donation.mainTransactionSignature} donation={item.donation} />
            ) : (
              <CommentItem key={`comment-${item.comment.id}`} comment={item.comment} />
            ))}
          </div>
          ) : <p className="py-8 text-center text-sm text-white/45">No activity yet. Be the first supporter.</p>}
        </>
        ) : (
        discoveryQuery.isLoading && !discoveryQuery.data ? <p className="py-8 text-center text-sm text-white/45">Loading discovery...</p> : (
          <div className={fillHeight ? 'min-h-0 flex-1 space-y-4 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.3)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/30 hover:[&::-webkit-scrollbar-thumb]:bg-white/50' : 'max-h-[24rem] space-y-4 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.3)_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/30 hover:[&::-webkit-scrollbar-thumb]:bg-white/50'}>
            {(discoveryQuery.data || []).filter((item) => item.campaignId !== campaign.id).map((item) => (
              <Link key={item.id} to="/campaign/$campaignId" params={{ campaignId: item.campaignId }} className="block rounded-lg p-2 transition-colors hover:bg-[#181819]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[#282b30]">
                    {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <Rocket className="m-3 h-4 w-4 text-[#58d16e]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{item.campaignTitle}</p>
                    <p className="mt-0.5 text-xs text-white/45">{item.type === 'campaign' ? `${item.actorName} launched a campaign` : `${item.actorName} funded ${item.amount ? `$${formatUsdc(Number(item.amount) / 1_000_000)} USDC` : 'a campaign'}`}</p>
                  </div>
                  <span className="shrink-0 text-xs text-white/35">{displayTime(item.timestamp)}</span>
                </div>
              </Link>
            ))}
          </div>
        )
        )}
      </div>
    </section>
  );
}

function DonationItem({ donation }: { donation: Donation }) {
  const donorName = donation.donorName || 'Dropfund supporter';

  return <article>
    <div className="flex items-center gap-3">
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#58d16e] text-sm font-semibold text-black">
      {donation.donorImage ? <img src={donation.donorImage} alt="" className="h-full w-full object-cover" /> : donorName.slice(0, 1).toUpperCase()}
    </div>
      <p className="min-w-0 flex-1 truncate text-sm text-white"><span className="font-semibold">{donorName}</span> <span className="text-white/60">funded</span> <span className="rounded bg-[#58d16e]/20 px-1.5 py-0.5 font-semibold text-[#58d16e]">${formatUsdc(Number(donation.amount) / 1_000_000)}</span></p>
      <span className="shrink-0 text-xs text-white/40">{displayTime(donation.timestamp)}</span>
    </div>
    {donation.message ? <p className="ml-11 mt-3 inline-block max-w-[calc(100%-2.75rem)] break-words whitespace-pre-wrap rounded-lg bg-[#282b30] px-3 py-2 text-sm leading-5 text-white/75">{linkifyText(donation.message)}</p> : null}
  </article>;
}

function CommentItem({ comment }: { comment: CampaignComment }) {
  return <article>
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#58d16e] text-sm font-semibold text-black">
        {comment.authorImage ? <img src={comment.authorImage} alt="" className="h-full w-full object-cover" /> : comment.authorName.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex flex-1 items-center gap-2"><p className="truncate text-sm font-semibold text-white">{comment.authorName}</p>{comment.isCreator ? <span className="rounded bg-[#4b54ff]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#aeb2ff]">Creator</span> : null}</div>
      <span className="shrink-0 text-xs text-white/40">{displayTime(comment.timestamp)}</span>
    </div>
    <p className="ml-11 mt-3 inline-block max-w-[calc(100%-2.75rem)] break-words whitespace-pre-wrap rounded-lg bg-[#282b30] px-3 py-2 text-sm leading-5 text-white/75">{linkifyText(comment.body)}</p>
  </article>;
}
