import { Link, useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Wallet, Plus, User, Loader2, Menu, X, BookOpen, LogOut } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import { usePrivyAuth } from './PrivyAuthProvider';
import { useFundWallet } from '@privy-io/react-auth/solana';
import { usePrivyBalances } from '../hooks/usePrivyBalances';

function getAvatarColor(address: string) {
  const colors = ['#4b54ff', '#e05d8f', '#e08b3e', '#36a269', '#8b62d9', '#2d9cdb'];
  const seed = address.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
  return colors[seed % colors.length];
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

export default function Header() {
  const { ready: privyReady, authenticated, configured: privyConfigured, login, logout, solanaAddress } = usePrivyAuth();
  const { usdcBalance, isLoading: balanceLoading } = usePrivyBalances();
  const { fundWallet } = useFundWallet();
  const [profile, setProfile] = useState<{ name?: string; image?: string } | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const accountControlRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

    useEffect(() => {
      if (!solanaAddress) {
        setProfile(null);
        return;
      }
      const readProfile = () => {
        try {
          setProfile(JSON.parse(localStorage.getItem(`dropfund-profile-${solanaAddress}`) || 'null'));
        } catch {
          setProfile(null);
        }
      };
      readProfile();
      window.addEventListener('dropfund-profile-updated', readProfile);
      return () => window.removeEventListener('dropfund-profile-updated', readProfile);
    }, [solanaAddress]);

    const handleFullLogout = async () => {
      try {
        await logout();
        queryClient.clear();
        // Removed duplicate toast here; provider will show it
      } catch (error) {
        toast.error('Failed to log out. Please try again.');
      }
    };
  // ...existing code...
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const onEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setMobileMenuOpen(false);
      };
      window.addEventListener('keydown', onEsc);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', onEsc);
      };
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setIsDropdownOpen(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (isDropdownOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDropdownOpen]);
  // ...existing code...

  // Show user controls once Privy authentication has created the embedded wallet.
  const showUserControls = authenticated;

  // ...existing code...

  const handleConnect = async () => {
    setMobileMenuOpen(false);
    if (!privyConfigured) {
      toast.error('Privy is not configured. Add VITE_PRIVY_APP_ID to the frontend environment.');
      return;
    }
    if (!privyReady) {
      toast.info('Authentication is still loading. Please try again in a moment.');
      return;
    }
    if (!authenticated) {
      login();
      return;
    }
    if (!solanaAddress) {
      toast.error('Your Solana wallet is not ready yet.');
      return;
    }
    try {
      await fundWallet({ address: solanaAddress, options: { chain: 'solana:mainnet', asset: 'USDC' } });
    } catch {
      toast.error('Privy funding was not completed.');
    }
  };

  // Removed old handleDisconnect (dev-only) to avoid confusion. Use handleFullLogout for all disconnects.

  const handleMyCampaigns = () => {
    setMobileMenuOpen(false);
    navigate({ to: '/my-profile' });
  };

  const handleCreateCampaign = () => {
    setMobileMenuOpen(false);
    navigate({ to: '/create' });
  };

  return (
    <header className="relative w-full bg-background/95 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <svg width="40" height="40" viewBox="0 0 1024 1024" className="object-contain" role="img" aria-label="Dropfund Logo">
            <defs />
            <path fill="#ffffff" d="m 186,0 h 652 c 102.72,0 186,83.28 186,186 v 652 c 0,102.72 -83.28,186 -186,186 H 186 C 83.28,1024 0,940.72 0,838 V 186 C 0,83.28 83.28,0 186,0 Z" />
            <path style={{ display: 'inline', fill: '#131313', fillOpacity: 1, stroke: 'none', strokeWidth: '0.750853' }} d="m 510.99791,199.6718 c -5.12661,1.67201 -9.15313,6.58554 -13.01092,10.09942 -9.64487,8.78499 -20.14357,18.10295 -28.42036,28.20103 -4.70844,5.74449 -8.35581,10.88179 -4.13742,18.02044 4.75093,8.0399 12.98929,14.47403 19.53914,21.02388 l 37.04207,37.04206 84.09548,84.09548 c 19.46436,19.46436 40.77896,37.62952 56.90951,60.0682 26.08908,36.29169 38.47142,83.91034 32.32216,128.1455 -2.18131,15.69127 -5.78793,31.33734 -11.74789,46.05228 -8.81128,21.75493 -21.92413,42.34911 -38.44331,59.06706 -17.78329,17.99737 -38.69933,33.21691 -62.06662,43.17708 -83.55965,35.61701 -180.79817,1.54447 -228.19426,-75.21345 -13.97645,-22.63482 -21.91136,-47.86477 -25.66571,-74.08411 -5.09081,-35.55245 3.07685,-74.78706 20.45608,-106.12049 5.80696,-10.46952 12.06293,-20.71926 19.62105,-30.03409 3.70533,-4.5666 10.33854,-9.89235 11.23032,-16.0182 0.87915,-6.03913 -4.89895,-11.17767 -8.69117,-15.01704 -10.23055,-10.35771 -20.30454,-21.09922 -31.03138,-30.94174 -4.29406,-3.94009 -10.06428,-8.03111 -15.92858,-4.66504 -5.16977,2.96743 -8.83111,9.06944 -12.5281,13.58178 -10.07527,12.29716 -19.12848,25.24275 -27.02762,39.04431 C 248.42655,499.6579 241.41805,579.21649 265.05125,649.4394 311.59982,787.75236 470.68867,860.92527 606.1059,808.55909 735.22644,758.62793 805.94989,610.68588 759.41573,479.24618 738.74447,420.85842 699.08084,381.00402 656.16273,338.08592 L 549.0411,230.96428 c -8.34143,-8.34144 -16.62856,-16.74191 -25.02842,-25.02456 -3.48191,-3.43341 -7.59712,-8.03481 -13.01477,-6.26792 m -98.1114,98.02487 c -14.23137,4.26339 -28.93003,25.02614 -39.02965,35.38355 -3.93691,4.03736 -10.09427,9.70525 -8.5753,16.01819 1.27647,5.30515 6.90176,10.24777 10.57756,14.01591 8.89328,9.11667 18.01035,18.02499 27.01604,27.0307 l 124.14093,124.14095 c 18.88076,18.88075 40.97775,40.0503 27.04616,69.07842 -14.3328,29.86411 -51.23832,36.04258 -74.09572,13.01405 -11.00114,-11.08351 -16.38388,-27.58882 -11.97731,-43.04815 3.05901,-10.73178 15.72629,-21.65013 6.77854,-32.03637 -10.35986,-12.02531 -22.5966,-22.84362 -33.84941,-34.03785 -3.79246,-3.77272 -8.92271,-9.8638 -15.01321,-8.53361 -8.09152,1.7672 -14.87418,16.01164 -18.82151,22.54873 -16.12587,26.70573 -21.97123,57.46882 -15.55624,88.10002 14.3541,68.53986 84.02689,111.52463 151.50689,94.73256 18.30961,-4.55627 35.42499,-13.62674 50.05685,-25.45871 12.07516,-9.76446 21.66998,-22.46546 28.77418,-36.23633 5.36209,-10.39401 9.21688,-21.56196 11.46748,-33.03752 6.6519,-33.91716 -0.37714,-68.87232 -20.64772,-97.11025 -11.98565,-16.69657 -28.13899,-30.57004 -42.62009,-45.05116 L 504.99109,382.13592 438.91607,316.0609 c -5.99286,-5.99282 -16.17074,-21.3177 -26.02956,-18.36423 z" />
          </svg>
          <span className="text-2xl font-bold text-white">Dropfund</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-4">
          {showUserControls ? (
            <>
              <div
                ref={accountControlRef}
                className="flex items-center gap-4 rounded-xl border border-[#282b30] bg-[#1d1e1f] px-3 py-2 transition-colors hover:bg-[#282b30]"
                onMouseEnter={() => {
                  if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                }}
              >
                <button type="button" onClick={handleConnect} className="text-left" aria-label="Deposit USDC">
                  <div className="text-sm font-semibold leading-5 text-white">{balanceLoading ? 'Loading...' : usdcBalance !== null ? `$${(Math.floor(usdcBalance * 100) / 100).toFixed(2)} USDC` : 'Balance unavailable'}</div>
                  <div className="text-sm font-semibold leading-5 text-[#58d16e]">Deposit</div>
                </button>
                <Button
                  ref={buttonRef}
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full text-white hover:bg-[#282b30]"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (accountControlRef.current) {
                      const rect = accountControlRef.current.getBoundingClientRect();
                      setDropdownPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                    }
                    setIsDropdownOpen((open) => !open);
                  }}
                  onMouseEnter={() => {
                    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                    if (accountControlRef.current) {
                      const rect = accountControlRef.current.getBoundingClientRect();
                      setDropdownPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
                    }
                    setIsDropdownOpen(true);
                  }}
                  onMouseLeave={() => {
                    closeTimeoutRef.current = setTimeout(() => setIsDropdownOpen(false), 150);
                  }}
                  aria-label="Open account menu"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-white" style={{ backgroundColor: solanaAddress ? getAvatarColor(solanaAddress) : '#4b54ff' }}>
                    {profile?.image ? <img src={profile.image} alt="Profile" className="h-full w-full rounded-full object-cover" /> : solanaAddress ? getNameInitials(profile?.name || getFunnyName(solanaAddress)) : <User className="h-5 w-5" />}
                  </span>
                </Button>
              </div>
                {ReactDOM.createPortal(
                  <div 
                    style={{ position: 'fixed', top: dropdownPosition.top, right: dropdownPosition.right, zIndex: 10001 }}
                    className={`w-64 space-y-2 rounded-xl border border-[#282b30] bg-[#1d1e1f] p-3 text-left shadow-md ${isDropdownOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={() => {
                      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                    }}
                    onMouseLeave={() => {
                      closeTimeoutRef.current = setTimeout(() => setIsDropdownOpen(false), 100);
                    }}
                  >
                    <Link to="/how-it-works" className="block rounded-sm p-3 text-left text-sm transition-colors hover:bg-[#282b30] hover:text-white">
                      <BookOpen className="mr-2 inline h-4 w-4" />
                      How It Works
                    </Link>
                    <Link to="/create" className="block rounded-sm p-3 text-left text-sm transition-colors hover:bg-[#282b30] hover:text-white">
                      <Plus className="mr-2 inline h-4 w-4" />
                      Create Campaign
                    </Link>
                    <Link to="/my-profile" className="block rounded-sm p-3 text-left text-sm transition-colors hover:bg-[#282b30] hover:text-white">
                      <User className="mr-2 inline h-4 w-4" />
                      My Profile
                    </Link>
                    <div onClick={handleFullLogout} className="cursor-pointer rounded-sm p-3 text-left text-sm text-destructive transition-colors hover:bg-[#282b30] hover:text-white">
                      <LogOut className="mr-2 inline h-4 w-4" />
                      Log out
                    </div>
                  </div>,
                  document.body
                )}

            </>
          ) : (
            <Button 
              onClick={handleConnect} 
              disabled={!privyReady} 
              style={{ backgroundColor: '#4b54ff', color: 'white' }}
              className="gap-2 hover:brightness-90 transition-opacity"
            >
              {!privyReady ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing wallet...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" />
                  Login
                </>
              )}
            </Button>
          )}
        </nav>

        {/* Mobile Navigation as dropdown */}
        <div className="md:hidden relative">
          {showUserControls ? (
            <Button
              variant="ghost"
              size="icon"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle mobile menu"
              className="relative z-[10001]"
              onClick={() => setMobileMenuOpen(prev => !prev)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={!privyReady}
              style={{ backgroundColor: '#4b54ff', color: 'white' }}
              className="gap-2 hover:brightness-90 transition-opacity"
            >
              {!privyReady ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparing wallet...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" />
                  Login
                </>
              )}
            </Button>
          )}
          {showUserControls && mounted &&
            ReactDOM.createPortal(
              <>
                <div
                  className={`fixed inset-0 bg-black/50 transition-opacity duration-200 z-[9999] ${
                    mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                />
                <div
                  className={`fixed inset-0 z-[10000] flex items-start justify-center sm:justify-end pt-20 sm:pt-16 sm:pr-6 transition-all duration-200 ${
                    mobileMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div
                    className="w-[90%] max-w-sm sm:w-[320px] space-y-3 p-4 rounded-xl shadow-2xl text-base text-left"
                    style={{ backgroundColor: '#1d1e1f' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <VisuallyHidden>Mobile Menu</VisuallyHidden>
                    {showUserControls ? (
                      <>
                        <div className="flex items-center gap-3 rounded-xl bg-[#282b30] px-3 py-3">
                          <Wallet className="h-5 w-5 shrink-0 text-white" />
                          <span className="min-w-0 flex-1 truncate text-base font-semibold">
                            {balanceLoading ? 'Loading balance...' : usdcBalance !== null ? `${(Math.floor(usdcBalance * 100) / 100).toFixed(2)} USDC` : 'Balance unavailable'}
                          </span>
                          <Button variant="secondary" className="shrink-0 bg-[#58d16e] px-3 py-2 text-black hover:bg-[#6ee67f]" onClick={() => { handleConnect(); }}>
                            Deposit
                          </Button>
                        </div>

                        <Button 
                          variant="ghost" 
                          className="justify-start gap-3 w-full text-base py-6 hover:bg-[#282b30] hover:text-white"
                          onClick={() => { setMobileMenuOpen(false); navigate({ to: '/how-it-works' }); }}
                        >
                          <BookOpen className="h-5 w-5" />
                          How It Works
                        </Button>

                        <Button 
                          variant="ghost" 
                          className="justify-start gap-3 w-full text-base py-6 hover:bg-[#282b30] hover:text-white"
                          onClick={() => { setMobileMenuOpen(false); handleCreateCampaign(); }}
                        >
                          <Plus className="h-5 w-5" />
                          Create Campaign
                        </Button>

                        <Button 
                          variant="ghost" 
                          className="justify-start gap-3 w-full text-base py-6 hover:bg-[#282b30] hover:text-white"
                          onClick={() => { setMobileMenuOpen(false); handleMyCampaigns(); }}
                        >
                          <User className="h-5 w-5" />
                          My Profile
                        </Button>

                        <div>
                          <Button 
                            variant="ghost" 
                            className="w-full text-left text-destructive text-base py-6 justify-start gap-3 hover:bg-[#282b30] hover:text-white"
                            onClick={() => { setMobileMenuOpen(false); handleFullLogout(); }}
                          >
                            <LogOut className="h-5 w-5" />
                            Log out
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Button 
                          variant="ghost" 
                          className="justify-center gap-3 w-full text-base py-6 hover:bg-[#282b30] hover:text-white"
                          onClick={() => { setMobileMenuOpen(false); navigate({ to: '/how-it-works' }); }}
                        >
                          How It Works
                        </Button>

                        <Button 
                          onClick={() => { setMobileMenuOpen(false); handleConnect(); }} 
                          disabled={!privyReady} 
                          style={{ backgroundColor: '#4b54ff', color: 'white' }}
                          className="gap-2 hover:brightness-90 transition-opacity w-full text-base py-6"
                        >
                        {!privyReady ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Preparing wallet...
                          </>
                        ) : (
                          <>
                            <Wallet className="h-5 w-5 mr-2" />
                            Login
                          </>
                        )}
                      </Button>
                      </>
                    )}
                  </div>
                </div>
              </>,
              document.body
            )}
        </div>
      </div>
    </header>
  );
}
