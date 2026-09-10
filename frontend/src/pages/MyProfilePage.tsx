import { useState } from 'react';
import { useGetCampaignsByCreator, useGetCampaigns, useGetUserDonations } from '../hooks/useQueries';
import { usePrivyAuth } from '../components/PrivyAuthProvider';
import { usePrivyBalances } from '../hooks/usePrivyBalances';
import WithdrawModal from '../components/WithdrawModal';
import { useFundWallet } from '@privy-io/react-auth/solana';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@tanstack/react-router';
import { BarChart3, Copy, Plus, UserRound, Camera, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatUsdc } from '@/lib/utils';
import { api } from '@/lib/api';

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getFunnyName(address: string) {
  const adjectives = ['Cosmic', 'Tiny', 'Lucky', 'Chaotic', 'Turbo', 'Sneaky', 'Mighty', 'Bouncy'];
  const nouns = ['Byte', 'Pickle', 'Wizard', 'Noodle', 'Rocket', 'Mango', 'Legend', 'Comet'];
  const seed = address.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
  return `${adjectives[seed % adjectives.length]} ${nouns[(seed * 7) % nouns.length]}`;
}

function getNameInitials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function getAvatarColor(address: string) {
  const colors = ['#4b54ff', '#e05d8f', '#e08b3e', '#36a269', '#8b62d9', '#2d9cdb'];
  const seed = address.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
  return colors[seed % colors.length];
}

function PortfolioChart({ direction, values }: { direction: 'inflow' | 'outflow'; values: number[] }) {
  const color = direction === 'inflow' ? '#58d16e' : '#ff641f';
  const width = 620;
  const height = 230;
  const padding = 12;
  const maximum = Math.max(...values, 0);
  const points = values.length > 0
    ? values.map((value, index) => ({
        x: values.length === 1 ? width / 2 : (index / (values.length - 1)) * width,
        y: height - padding - (maximum > 0 ? (value / maximum) * (height - padding * 2) : 0),
      }))
    : [{ x: 0, y: height - padding }, { x: width, y: height - padding }];
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const areaPath = `${path} L${width} ${height} L0 ${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none" aria-label="Portfolio value chart" role="img">
      {maximum > 0 ? <path d={areaPath} fill={color} fillOpacity="0.08" /> : null}
      <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </svg>
  );
}

export default function MyProfilePage() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'donations'>('campaigns');
  const [timeRange, setTimeRange] = useState<'24H' | '7D' | '30D' | 'ALL'>('24H');
  const { authenticated, solanaAddress, getAccessToken } = usePrivyAuth();
  const { usdcBalance, isLoading: balanceLoading, balanceError } = usePrivyBalances();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const profileKey = solanaAddress ? `dropfund-profile-${solanaAddress}` : '';
  let savedProfile: { name?: string; image?: string } = {};
  if (profileKey) {
    try {
      savedProfile = JSON.parse(localStorage.getItem(profileKey) || '{}');
    } catch {
      savedProfile = {};
    }
  }
  const [profileName, setProfileName] = useState(savedProfile.name || getFunnyName(solanaAddress || 'guest'));
  const [profileImage, setProfileImage] = useState<string | null>(savedProfile.image || null);
  const { fundWallet } = useFundWallet();
  const walletAddress = solanaAddress;
  const { data: campaigns = [], isLoading: campaignsLoading } = useGetCampaignsByCreator(walletAddress);
  const { data: allCampaigns = [] } = useGetCampaigns();
  const { data: donations = [], isLoading: donationsLoading } = useGetUserDonations(walletAddress);


    if (!authenticated || !solanaAddress) {
      return (
        <div className="container flex min-h-[calc(100vh-10rem)] items-center justify-center py-12">
          <Card className="w-full max-w-md border-0 bg-[#1d1e1f] p-8 text-center">
            <UserRound className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Sign in to view your profile</h1>
            <p className="mt-3 text-muted-foreground">Your Privy account and embedded Solana wallet will appear here.</p>
          </Card>
        </div>
      );
    }

  // Join donations with campaigns for display
  const donationsWithCampaigns = donations.map(donation => ({
    ...donation,
    campaign: allCampaigns.find(c => c.id === donation.campaignId)
  })).sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
  const formatCampaignStatus = (status?: string) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  };
  const isInflow = activeTab === 'campaigns';
  const chartEvents = isInflow
    ? campaigns.map((campaign) => ({ timestamp: Number(campaign.createdAt), amount: Number(campaign.totalRaised) / 1e6 }))
    : donations.map((donation) => ({ timestamp: Number(donation.timestamp), amount: Number(donation.amount) / 1e6 }));
  chartEvents.sort((a, b) => a.timestamp - b.timestamp);
  const rangeNanos = { '24H': 24 * 60 * 60 * 1e9, '7D': 7 * 24 * 60 * 60 * 1e9, '30D': 30 * 24 * 60 * 60 * 1e9, ALL: null }[timeRange];
  const cutoff = rangeNanos === null ? null : Date.now() * 1e6 - rangeNanos;
  const filteredChartEvents = cutoff === null ? chartEvents : chartEvents.filter((event) => event.timestamp >= cutoff);
  const activityAmount = filteredChartEvents.reduce((total, event) => total + event.amount, 0);
  let runningTotal = 0;
  const chartValues = (isInflow && filteredChartEvents.length > 0
    ? [{ timestamp: cutoff ?? filteredChartEvents[0].timestamp, amount: 0 }, ...filteredChartEvents]
    : filteredChartEvents
  ).map((event) => {
    runningTotal += event.amount;
    return runningTotal;
  });

    const copyAddress = async () => {
      await navigator.clipboard.writeText(solanaAddress);
      toast.success('Wallet address copied');
    };
    const openFunding = async () => {
      if (!solanaAddress) return;
      await fundWallet({ address: solanaAddress, options: { chain: 'solana:mainnet', asset: 'USDC' } });
    };
    const saveProfile = async () => {
      if (!profileKey) return;
      const name = profileName.trim() || getFunnyName(solanaAddress);
      localStorage.setItem(profileKey, JSON.stringify({ name, image: profileImage }));
      window.dispatchEvent(new Event('dropfund-profile-updated'));
      setEditOpen(false);
      const token = await getAccessToken();
      if (token) {
        try {
          await api.saveProfile({ name, walletAddress: solanaAddress }, profileImage, token);
        } catch (error) {
          console.error('Failed to sync profile to API:', error);
          toast.error('Profile saved locally, but server sync failed.');
        }
      }
      toast.success('Profile updated');
    };
  return (
      <div className="min-h-screen bg-[#131313] pt-16 pb-8 text-white">
        <div className="container mx-auto w-full">
          <section className="border-b border-[#282b30] pb-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              {profileImage ? <img src={profileImage} alt="Profile" className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold" style={{ backgroundColor: getAvatarColor(solanaAddress) }}>{getNameInitials(profileName)}</div>}
              <div className="flex-1">
                <h1 className="text-2xl font-bold tracking-tight">{profileName}</h1>
                <button onClick={copyAddress} className="mt-1 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
                  @{formatAddress(solanaAddress)} <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex gap-8 text-center sm:mr-4">
                <div><div className="text-xl font-semibold">{campaigns.length}</div><div className="text-xs text-white/45">Campaigns</div></div>
                <div><div className="text-xl font-semibold">{donations.length}</div><div className="text-xs text-white/45">Donations</div></div>
              </div>
              <Button variant="outline" className="border-[#282b30] bg-[#1d1e1f] text-white hover:bg-[#282b30] hover:text-white" onClick={() => setEditOpen(true)}>Edit profile</Button>
            </div>
          </section>

          <section className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.7fr)]">
            <div>
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-4xl font-semibold tracking-tight">${formatUsdc(activityAmount)}</p>
                  <p className={`mt-1 text-sm ${isInflow ? 'text-[#58d16e]' : 'text-[#ff641f]'}`}>{isInflow ? '+' : '-'}${formatUsdc(activityAmount)} <span className="text-white/45">{isInflow ? 'cash inflow' : 'cash outflow'}</span></p>
                </div>
                <div className="flex rounded-lg bg-[#1d1e1f] p-1 text-xs text-white/45">
                  {(['24H', '7D', '30D', 'ALL'] as const).map((range) => <button key={range} onClick={() => setTimeRange(range)} className={`rounded-md px-3 py-1.5 ${timeRange === range ? 'bg-[#282b30] text-white' : 'text-white/45 hover:text-white'}`}>{range}</button>)}
                </div>
              </div>
              <div className="h-[230px] w-full border-b border-[#282b30]">
                <PortfolioChart direction={isInflow ? 'inflow' : 'outflow'} values={chartValues} />
              </div>
              <div className="mt-6 flex w-full items-center justify-between rounded-xl bg-[#1d1e1f] p-4">
                <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#282b30] text-2xl leading-none">$</span><div><p className="text-xs text-white/45">Total cash</p><p className="font-semibold">{balanceLoading ? 'Loading...' : usdcBalance !== null ? `${(Math.floor(usdcBalance * 100) / 100).toFixed(2)} USDC` : 'Unavailable'}</p>{balanceError ? <p className="max-w-[220px] break-words text-[11px] text-rose-400">{balanceError}</p> : null}</div></div>
                <div className="flex gap-2"><Button variant="outline" size="sm" className="border-[#282b30] bg-[#131313] text-white" onClick={() => setWithdrawOpen(true)}>Withdraw</Button><Button size="sm" className="bg-[#58d16e] text-black hover:bg-[#6ee67f]" onClick={openFunding}>Deposit</Button></div>
              </div>
            </div>

            <section className="overflow-hidden rounded-xl border border-[#282b30] bg-[#1d1e1f]">
              <div className="flex border-b border-[#282b30]">
                <button onClick={() => setActiveTab('campaigns')} className={`flex-1 px-5 py-4 text-left text-sm font-medium ${activeTab === 'campaigns' ? 'text-white' : 'text-white/40'}`}>Campaigns</button>
                <button onClick={() => setActiveTab('donations')} className={`flex-1 px-5 py-4 text-left text-sm font-medium ${activeTab === 'donations' ? 'text-white' : 'text-white/40'}`}>Donations</button>
              </div>
              <div className="grid grid-cols-[1fr_70px_75px] border-b border-[#282b30] px-4 py-2 text-[11px] text-white/35"><span>Name</span><span>Status</span><span className="text-right">Amount</span></div>
              <div className="max-h-[340px] overflow-y-auto">
                {activeTab === 'campaigns' ? (
                  campaignsLoading ? <div className="space-y-3 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div> : campaigns.length ? campaigns.map((campaign) => <Link key={campaign.id} to="/campaign/$campaignId" params={{ campaignId: campaign.id }} className="grid grid-cols-[1fr_70px_75px] items-center border-b border-[#282b30] px-4 py-3 text-sm hover:bg-[#282b30]"><span className="flex min-w-0 items-center gap-3"><img src={campaign.thumbnailUrl?.[0] || '/assets/generated/campaign-placeholder.dim_400x300.jpg'} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /><span className="truncate">{campaign.title}</span></span><span className={campaign.status === 'active' ? 'text-[#58d16e]' : 'text-white/60'}>{formatCampaignStatus(campaign.status)}</span><span className="text-right">{(Number(campaign.totalRaised) / 1e6).toFixed(2)} USDC</span></Link>) : <EmptyActivity label="No campaigns yet" />
                ) : (
                  donationsLoading ? <div className="p-4 text-sm text-white/45">Loading donations...</div> : donationsWithCampaigns.length ? donationsWithCampaigns.map((donation, index) => <Link key={`${donation.campaignId}-${index}`} to="/campaign/$campaignId" params={{ campaignId: donation.campaignId }} className="grid grid-cols-[1fr_70px_75px] items-center border-b border-[#282b30] px-4 py-3 text-sm hover:bg-[#282b30]"><span className="flex min-w-0 items-center gap-3"><img src={donation.campaign?.thumbnailUrl?.[0] || '/assets/generated/campaign-placeholder.dim_400x300.jpg'} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /><span className="truncate">{donation.campaign?.title || 'Campaign'}</span></span><span className={donation.campaign?.status === 'active' ? 'text-[#58d16e]' : 'text-white/60'}>{formatCampaignStatus(donation.campaign?.status)}</span><span className="text-right">{(Number(donation.amount) / 1e6).toFixed(2)} USDC</span></Link>) : <EmptyActivity label="No donations yet" />
                )}
              </div>
              <Link to={activeTab === 'campaigns' ? '/create' : '/'} className="flex items-center justify-center gap-2 border-t border-[#282b30] px-4 py-3 text-sm text-white/55 hover:text-white"><Plus className="h-4 w-4" />{activeTab === 'campaigns' ? 'Create campaign' : 'Explore campaigns'}</Link>
            </section>
          </section>
        </div>
        {editOpen && <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 backdrop-blur-[3px]" onClick={() => setEditOpen(false)}><div className="w-full max-w-md rounded-2xl bg-[#1d1e1f] p-6 text-white" onClick={(event) => event.stopPropagation()}><div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-semibold">Edit profile</h2><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white" onClick={() => setEditOpen(false)} aria-label="Close profile editor"><X className="h-5 w-5" /></Button></div><div className="mb-6 flex items-center gap-4"><div className="relative shrink-0"><div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full text-3xl font-bold" style={{ backgroundColor: getAvatarColor(solanaAddress) }}>{profileImage ? <img src={profileImage} alt="Profile preview" className="h-full w-full object-cover" /> : getNameInitials(profileName)}</div><label className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-[#1d1e1f] bg-[#282b30] text-white hover:bg-[#3a3c43]" aria-label="Upload profile picture"><Camera className="h-4 w-4" /><input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setProfileImage(String(reader.result)); reader.readAsDataURL(file); }} /></label></div><div className="min-w-0"><p className="font-medium">Profile picture</p><p className="mt-1 text-sm text-white/50">Upload a photo or use your initials.</p>{profileImage && <button type="button" className="mt-2 inline-flex items-center gap-1.5 text-sm text-rose-400 hover:text-rose-300" onClick={() => setProfileImage(null)}><Trash2 className="h-3.5 w-3.5" />Delete photo</button>}</div></div><label className="mb-2 block text-sm text-white/60">Display name</label><input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="mb-6 w-full rounded-xl border border-[#282b30] bg-[#282b30] px-4 py-3 text-white outline-none" maxLength={32} /><Button className="h-[3.2rem] w-full text-lg font-semibold" onClick={saveProfile}>Save profile</Button></div></div>}
        <WithdrawModal balance={usdcBalance} open={withdrawOpen} onOpenChange={setWithdrawOpen} />
      </div>
    );
  }

  function EmptyActivity({ label }: { label: string }) {
    return <div className="px-4 py-12 text-center text-sm text-white/40"><BarChart3 className="mx-auto mb-3 h-7 w-7" />{label}</div>;
  }
