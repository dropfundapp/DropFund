import { useEffect, useState } from 'react';
import { useGetCampaignsByCreator, useGetCampaigns, useGetUserDonations } from '../hooks/useQueries';
import { usePrivyAuth } from '../components/PrivyAuthProvider';
import { usePrivyBalances } from '../hooks/usePrivyBalances';
import WithdrawModal from '../components/WithdrawModal';
import { useFundWallet } from '@privy-io/react-auth/solana';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@tanstack/react-router';
import { BarChart3, Copy, Plus, UserRound, Camera, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import OdometerNumber from '@/components/OdometerNumber';

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

type CachedProfile = { name: string; image: string | null };
type BalanceSnapshot = { timestamp: number; balance: number };

function getCachedProfile(walletAddress?: string | null): CachedProfile | null {
  if (!walletAddress) return null;
  try {
    return JSON.parse(localStorage.getItem(`dropfund-profile-${walletAddress}`) || 'null');
  } catch {
    return null;
  }
}

function saveCachedProfile(walletAddress: string, profile: CachedProfile) {
  localStorage.setItem(`dropfund-profile-${walletAddress}`, JSON.stringify(profile));
  window.dispatchEvent(new Event('dropfund-profile-updated'));
}

function getBalanceHistory(walletAddress: string): BalanceSnapshot[] {
  try {
    const history = JSON.parse(localStorage.getItem(`dropfund-balance-history-${walletAddress}`) || '[]');
    return Array.isArray(history)
      ? history.filter((snapshot): snapshot is BalanceSnapshot => Number.isFinite(snapshot?.timestamp) && Number.isFinite(snapshot?.balance))
      : [];
  } catch {
    return [];
  }
}

export default function MyProfilePage() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'donations'>('campaigns');
  const { authenticated, solanaAddress, getAccessToken } = usePrivyAuth();
  const { usdcBalance, isLoading: balanceLoading, balanceError } = usePrivyBalances();
  const [balanceChange24h, setBalanceChange24h] = useState<number | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [profileName, setProfileName] = useState(() => getCachedProfile(solanaAddress)?.name || getFunnyName(solanaAddress || 'guest'));
  const [profileImage, setProfileImage] = useState<string | null>(() => getCachedProfile(solanaAddress)?.image || null);
  const { fundWallet } = useFundWallet();
  const queryClient = useQueryClient();
  const walletAddress = solanaAddress;
  const { data: campaigns = [], isLoading: campaignsLoading } = useGetCampaignsByCreator(walletAddress);
  const { data: allCampaigns = [] } = useGetCampaigns();
  const { data: donations = [], isLoading: donationsLoading } = useGetUserDonations(walletAddress);

  useEffect(() => {
    if (!solanaAddress || usdcBalance === null) {
      setBalanceChange24h(null);
      return;
    }
    const now = Date.now();
    const history = getBalanceHistory(solanaAddress).filter((snapshot) => snapshot.timestamp >= now - 25 * 60 * 60 * 1000);
    const baseline = history[history.length - 1];

    setBalanceChange24h(baseline ? usdcBalance - baseline.balance : null);

    const latest = history[history.length - 1];
    if (!latest || now - latest.timestamp >= 1_000) {
      localStorage.setItem(`dropfund-balance-history-${solanaAddress}`, JSON.stringify([...history, { timestamp: now, balance: usdcBalance }]));
    }
  }, [solanaAddress, usdcBalance]);

  useEffect(() => {
    if (!authenticated || !solanaAddress) return;
    let cancelled = false;
    const cachedProfile = getCachedProfile(solanaAddress);
    if (cachedProfile) {
      setProfileName(cachedProfile.name);
      setProfileImage(cachedProfile.image);
    }
    void (async () => {
      const token = await getAccessToken();
      if (!token) return;
      try {
        const profile = await api.profile(solanaAddress, token);
        if (cancelled) return;
        setProfileName(profile.name);
        setProfileImage(profile.image);
        saveCachedProfile(solanaAddress, { name: profile.name, image: profile.image });
      } catch (error) {
        console.error('Failed to load profile:', error);
        toast.error('Failed to load your profile.');
      }
    })();
    return () => { cancelled = true; };
  }, [authenticated, solanaAddress, getAccessToken]);


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
    const copyAddress = async () => {
      await navigator.clipboard.writeText(solanaAddress);
      toast.success('Wallet address copied');
    };
    const openFunding = async () => {
      if (!solanaAddress) return;
      await fundWallet({ address: solanaAddress, options: { chain: 'solana:mainnet', asset: 'USDC' } });
    };
    const saveProfile = async () => {
      const name = profileName.trim() || getFunnyName(solanaAddress);
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      try {
        const result = await api.saveProfile({ name, walletAddress: solanaAddress }, profileImage, token);
        setProfileName(result.name);
        saveCachedProfile(solanaAddress, { name: result.name, image: profileImage });
        await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        await queryClient.invalidateQueries({ queryKey: ['campaign'] });
        await queryClient.invalidateQueries({ queryKey: ['myCampaigns', solanaAddress] });
        setEditOpen(false);
      } catch (error: any) {
        console.error('Failed to save profile:', error);
        toast.error(error.message || 'Failed to save profile.');
        return;
      }
      toast.success('Profile updated');
    };
  return (
      <div className="bg-[#111111] pt-10 pb-12 text-white">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <section>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-5 sm:flex-1">
                {profileImage ? <img src={profileImage} alt="Profile" className="h-20 w-20 shrink-0 rounded-full object-cover" /> : <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-3xl font-bold" style={{ backgroundColor: getAvatarColor(solanaAddress) }}>{getNameInitials(profileName)}</div>}
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-bold tracking-tight">{profileName}</h1>
                  <button onClick={copyAddress} className="mt-1 inline-flex max-w-full items-center gap-2 text-sm text-white/50 hover:text-white">
                    <span className="truncate">@{formatAddress(solanaAddress)}</span> <Copy className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-4 sm:mr-4 sm:gap-8">
                <div className="flex gap-5 text-center sm:gap-8">
                  <div><div className="text-xl font-semibold">{campaigns.length}</div><div className="text-xs text-white/45">Campaigns</div></div>
                  <div><div className="text-xl font-semibold">{donations.length}</div><div className="text-xs text-white/45">Donations</div></div>
                </div>
                <Button variant="outline" className="border-[#282b30] bg-[#1d1e1f] text-white hover:bg-[#282b30] hover:text-white sm:hidden" onClick={() => setEditOpen(true)}>Edit profile</Button>
              </div>
              <Button variant="outline" className="hidden border-[#282b30] bg-[#1d1e1f] text-white hover:bg-[#282b30] hover:text-white sm:inline-flex" onClick={() => setEditOpen(true)}>Edit profile</Button>
            </div>
          </section>

          <section className="space-y-6 py-8">
            <div className="flex w-full flex-col gap-5 rounded-[1.35rem] bg-[#181819] px-6 py-6 sm:min-h-[130px] sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-base font-medium text-white/50">Balance</p>
                <div className="mt-0.5 flex items-baseline whitespace-nowrap text-[1.65rem] font-semibold leading-none tracking-tight">
                  {balanceLoading ? 'Loading...' : usdcBalance !== null ? <><span>$</span><OdometerNumber value={(Math.floor(usdcBalance * 100) / 100).toFixed(2)} /><span className="ml-1">USDC</span></> : 'Unavailable'}
                </div>
                {balanceChange24h !== null ? <p className={`mt-2 text-sm font-medium ${balanceChange24h > 0 ? 'text-[#58d16e]' : balanceChange24h < 0 ? 'text-[#ff641f]' : 'text-white/55'}`}>{balanceChange24h > 0 ? '+' : ''}${balanceChange24h.toFixed(2)}</p> : <p className="mt-2 text-sm text-white/45">Change tracking starts on refresh</p>}
                {balanceError ? <p className="mt-2 max-w-[220px] break-words text-[11px] text-rose-400">{balanceError}</p> : null}
              </div>
              <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-auto sm:min-w-[254px]"><Button size="lg" className="h-[3.2rem] bg-white text-base font-semibold text-black hover:bg-white/90" onClick={() => setWithdrawOpen(true)}>Withdraw</Button><Button size="lg" className="h-[3.2rem] bg-[#58d16e] text-base font-semibold text-black hover:bg-[#6ee67f]" onClick={openFunding}>Deposit</Button></div>
            </div>

            <section className="overflow-hidden rounded-xl border border-[#282b30] bg-[#1d1e1f]">
              <div className="flex border-b border-[#282b30]">
                <button onClick={() => setActiveTab('campaigns')} className={`flex-1 px-5 py-4 text-center text-sm font-medium ${activeTab === 'campaigns' ? 'text-white' : 'text-white/40'}`}>Campaigns</button>
                <button onClick={() => setActiveTab('donations')} className={`flex-1 px-5 py-4 text-center text-sm font-medium ${activeTab === 'donations' ? 'text-white' : 'text-white/40'}`}>Donations</button>
              </div>
              <div className="grid grid-cols-[1fr_70px_75px] border-b border-[#282b30] px-4 py-2 text-[11px] text-white/35"><span>Name</span><span>Status</span><span className="text-right">Amount</span></div>
              <div className="max-h-[340px] overflow-y-auto">
                {activeTab === 'campaigns' ? (
                  campaignsLoading ? <div className="space-y-3 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div> : campaigns.length ? campaigns.map((campaign) => <Link key={campaign.id} to="/campaign/$campaignId" params={{ campaignId: campaign.id }} className="grid grid-cols-[1fr_70px_75px] items-center px-4 py-3 text-sm hover:bg-[#282b30]"><span className="flex min-w-0 items-center gap-3"><img src={campaign.thumbnailUrl?.[0] || '/assets/generated/campaign-placeholder.dim_400x300.jpg'} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /><span className="truncate">{campaign.title}</span></span><span className={campaign.status === 'active' ? 'text-[#58d16e]' : 'text-white/60'}>{formatCampaignStatus(campaign.status)}</span><span className="text-right">${(Number(campaign.totalRaised) / 1e6).toFixed(2)}</span></Link>) : <EmptyActivity label="No campaigns yet" />
                ) : (
                  donationsLoading ? <div className="p-4 text-sm text-white/45">Loading donations...</div> : donationsWithCampaigns.length ? donationsWithCampaigns.map((donation, index) => <Link key={`${donation.campaignId}-${index}`} to="/campaign/$campaignId" params={{ campaignId: donation.campaignId }} className="grid grid-cols-[1fr_70px_75px] items-center px-4 py-3 text-sm hover:bg-[#282b30]"><span className="flex min-w-0 items-center gap-3"><img src={donation.campaign?.thumbnailUrl?.[0] || '/assets/generated/campaign-placeholder.dim_400x300.jpg'} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" /><span className="truncate">{donation.campaign?.title || 'Campaign'}</span></span><span className={donation.campaign?.status === 'active' ? 'text-[#58d16e]' : 'text-white/60'}>{formatCampaignStatus(donation.campaign?.status)}</span><span className="text-right">${(Number(donation.amount) / 1e6).toFixed(2)}</span></Link>) : <EmptyActivity label="No donations yet" />
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
