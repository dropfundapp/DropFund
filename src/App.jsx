/// ---------------------------
// 🌐 Imports
// ---------------------------

// ✅ Use ONE unified anchor import — avoid duplicate named imports
import * as anchor from "@coral-xyz/anchor";
const { web3, BN, AnchorProvider, Program } = anchor;

// Solana Web3
import { Connection, PublicKey } from "@solana/web3.js";

// Local utils
import { sendDonationTransaction } from './utils/donations';

// React + Hooks
import { useState, useEffect, useRef, useMemo } from "react";

// DevFun SDK
import { useDevapp, UserButton } from "@devfunlabs/web-sdk";

// UI Icons
import {
  Rocket, TrendingUp, DollarSign, Users, User, Target, CheckCircle, ArrowRight,
  Plus, X, Coins, Menu, Search, Upload, Star, Clock, Zap, Share2, Copy, Check, Globe, Send, Droplets, Eye, Shield
} from "lucide-react";

// Needed for Buffer in browsers
import { Buffer } from "buffer";
window.Buffer = Buffer;

// Solana Wallet Adapter
import { useWallet } from '@solana/wallet-adapter-react'; //
//import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'; //
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'; // Add this import
//import { Wallet } from '@solana/wallet-adapter-react'; // Add this import
//import { PublicKey } from "@solana/web3.js";
//import { Transaction } from "@solana/web3.js"; // Or just use `any` if not using TypeScript
// ---------------------------
// ⚙️ IDL + Constants
// ---------------------------
import idl from "./idl/direct_donation.json";

// Constants that don't need to be in the component
import { PROGRAM_ID, NETWORK, PLATFORM_WALLET, DEBUG } from './config/environment';


// ---------------------------
// ⚙️ Provider Implementation
// ---------------------------

// Minimal provider that matches exactly what Anchor expects
class MinimalProvider {
  constructor(connection, wallet, opts = {}) {
    this.connection = connection;
    this.wallet = wallet;
    this.opts = opts;
    this.publicKey = wallet.publicKey;
  }

  async send(tx, signers, opts) {
    if (signers === undefined) {
      signers = [];
    }
    if (opts === undefined) {
      opts = this.opts;
    }
    tx.feePayer = this.wallet.publicKey;
    tx.recentBlockhash = (
      await this.connection.getLatestBlockhash(opts.preflightCommitment)
    ).blockhash;

    await this.wallet.signTransaction(tx);
    const rawTx = tx.serialize();
    const sig = await this.connection.sendRawTransaction(rawTx, opts);
    return sig;
  }

  async sendAndConfirm(tx, signers, opts) {
    const sig = await this.send(tx, signers, opts);
    await this.connection.confirmTransaction(sig, opts?.commitment || this.opts.commitment);
    return sig;
  }
}

// Wallet adapter that implements exactly what Anchor needs
class AnchorWallet {
  constructor(wallet, publicKeyOverride) {
    if (!wallet?.adapter) throw new Error('Wallet with adapter is required');
    
    this._wallet = wallet;
    this._adapter = wallet.adapter;
    this._publicKey = publicKeyOverride instanceof PublicKey ? publicKeyOverride : new PublicKey(publicKeyOverride || wallet.publicKey);
  }

  get publicKey() { 
    return this._publicKey;
  }

  async signTransaction(tx) {
    return this._adapter.signTransaction(tx);
  }

  async signAllTransactions(txs) {
    return this._adapter.signAllTransactions(txs);
  }
}

// ---------------------------
// ⚙️ React Components
// ---------------------------

// Separate component for debug panel to ensure it updates
function DebugPanel() {
  const { publicKey, connected, wallet } = useWallet();
  const { userWallet } = useDevapp();
  const walletAddress = publicKey?.toBase58();
  const currentUser = userWallet || walletAddress;

  // Force debug panel to update on any wallet state change
  useEffect(() => {
    if (DEBUG) {
      console.log('[DEBUG] currentUser:', currentUser);
      console.log('[DEBUG] publicKey:', publicKey);
      console.log('[DEBUG] connected:', connected);
    }
  }, [currentUser, publicKey, connected]);

  return (
    <div className="fixed top-4 right-4 z-[999] bg-white/90 border px-3 py-2 rounded-md text-xs text-gray-800 shadow">
      <div>connected: {String(connected)}</div>
      <div>publicKey: {publicKey ? publicKey.toBase58().slice(0,6) + '...' : 'null'}</div>
      <div>currentUser: {currentUser ? String(currentUser).slice(0,8) + '...' : 'null'}</div>
      <div>wallet.name: {wallet?.name || 'null'}</div>
      <div>wallet.readyState: {wallet?.readyState || 'null'}</div>
      <div>window.solana: {typeof window !== 'undefined' && window.solana ? (window.solana.isPhantom ? 'phantom' : 'present') : 'none'}</div>
    </div>
  );
}

function App() {
  const { devbaseClient, userWallet } = useDevapp();
  const { publicKey, connected, connect, disconnect, wallet, wallets, select } = useWallet();

  // Memoize expensive objects
  const connection = useMemo(() => new Connection(NETWORK, "confirmed"), []);
  
  // Validate IDL at component level
  const validatedIdl = useMemo(() => {
    if (!idl || !idl.instructions) {
      console.error("Invalid IDL format - missing instructions");
      return null;
    }
    return idl;
  }, []);

  const walletAddress = publicKey?.toBase58();
  // Unified user identity: prefer Devapp user, fall back to connected wallet address
  const currentUser = userWallet || walletAddress;


  // 💸 On-chain donation
  const donate = async () => {
    if (!donationAmount || !selectedCampaign) return;
    setLoading(true);

      try {
        if (!connected || !publicKey || !wallet) {
          setToast({ type: 'error', message: 'Please connect your wallet first' });
          setLoading(false);
          return;
        }

        // Create an Anchor-compatible wallet wrapper
        if (!wallet || !wallet.adapter || !publicKey) {
          throw new Error('Wallet is not properly connected');
        }

        const anchorWallet = new AnchorWallet(wallet, publicKey);

        // Initialize our minimal provider
        const provider = new MinimalProvider(
          connection,
          anchorWallet,
          {
            commitment: "confirmed",
            preflightCommitment: "confirmed"
          }
        );

        anchor.setProvider(provider);

        // Validate IDL and initialize program
        if (!validatedIdl) {
          throw new Error('IDL is not loaded properly. Cannot initialize program.');
        }

        const program = new anchor.Program(validatedIdl, PROGRAM_ID, provider);

        if (!program.programId) {
          throw new Error('Program ID is missing after initialization');
        }

        const creator = new PublicKey(selectedCampaign.userId);
        const platform = new PublicKey(PLATFORM_WALLET);
        const amount = new anchor.BN(parseFloat(donationAmount) * web3.LAMPORTS_PER_SOL);

        if (DEBUG) console.log("💸 Sending donation:", amount.toString());

        // Send donation using helper (handles instruction encoding, signing, and sending)
        const txSig = await sendDonationTransaction({
          amount,
          donor: publicKey,
          creator,
          platform,
          programId: PROGRAM_ID,
          idl: validatedIdl,
          connection,
          wallet: anchorWallet,
        });

      if (DEBUG) console.log("✅ Donation complete! Tx:", txSig);

      await devbaseClient.createEntity("donations", {
        campaignId: selectedCampaign.id,
        amount: parseFloat(donationAmount),
        txSig,
      });

      setDonationAmount("");
      await loadCampaignDetails(selectedCampaign.id);
      await loadCampaigns();

    } catch (err) {
      console.error("❌ Transaction failed:", err);
      const errorMessage = err.message || err.toString();
      if (errorMessage.includes('User rejected')) {
        setToast({ type: 'error', message: 'Transaction cancelled' });
      } else {
        setToast({ type: 'error', message: `Transaction failed: ${errorMessage}` });
      }
    } finally {
      setLoading(false);
    }
  };





const connectWallet = async () => {
  // Trigger wallet connection via the hook
  try {
    await connect(); //
  } catch (err) {
    console.error("Wallet connection failed:", err);
    setToast({ type: 'error', message: 'Wallet connection failed. Please install Phantom wallet' });
  }
};
const [walletMenuOpen, setWalletMenuOpen] = useState(false);

const copyAddress = () => {
  if (walletAddress) {
    navigator.clipboard.writeText(walletAddress);
    //alert("Address copied to clipboard!");
  }
};

const disconnectWallet = async () => {
  // Trigger wallet disconnection via the hook
  try {
    await disconnect(); //
  } catch (e) {
    console.warn("Already disconnected or wallet not available:", e);
  }
  
  setWalletMenuOpen(false);
};


  

  

 const [view, setView] = useState('home');
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [userCampaigns, setUserCampaigns] = useState([]);
  const [userDonations, setUserDonations] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    description: '',
    goal: '',
    image: '',
    token: 'SOL',
    milestones: [],
    websiteUrl: '',
    xUrl: '',
    telegramUrl: ''
  });
  const [imagePreview, setImagePreview] = useState('');
  const [newMilestone, setNewMilestone] = useState({
    description: '',
    targetAmount: ''
  });
  const [donationAmount, setDonationAmount] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('featured');
  const [profileFilter, setProfileFilter] = useState('campaigns');
  const [, setUserTwitterUsername] = useState(null);
  const [dynamicWord, setDynamicWord] = useState('anything');
  const [viewedUserId, setViewedUserId] = useState(null);
  const [wordColor, setWordColor] = useState('#e11d48');
  const [showShareModal, setShowShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [toast, setToast] = useState(null);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const fileInputRef = useRef(null);
  const filterScrollRef = useRef(null);
  const scrollPositionRef = useRef(0);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Block body scroll when feature modal is open
  useEffect(() => {
    if (showFeatureModal) {
      scrollPositionRef.current = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = `-${scrollPositionRef.current}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      window.scrollTo(0, scrollPositionRef.current);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [showFeatureModal]);

  useEffect(() => {
    loadCampaigns();
    checkOAuthCallback();
  }, [devbaseClient]);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // Check for campaign query parameter when campaigns are loaded
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const campaignId = urlParams.get('campaign');
    if (campaignId && campaigns.length > 0) {
      const campaign = campaigns.find(c => c.id === campaignId);
      if (campaign) {
        setSelectedCampaign(campaign);
        setView('details');
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [campaigns]);
  useEffect(() => {
    if ((viewedUserId || (connected && publicKey)) && campaigns.length > 0) {
      const targetUserId = viewedUserId || publicKey.toBase58();
      const filtered = campaigns.filter(c => c.userId === targetUserId);
      setUserCampaigns(filtered);
    } else {
      setUserCampaigns([]);
    }
  }, [connected, publicKey, campaigns, viewedUserId]);
  useEffect(() => {
    if ((viewedUserId || (connected && publicKey)) && view === 'profile') {
      loadUserDonations();
    }
  }, [connected, publicKey, view, devbaseClient, viewedUserId]);
  useEffect(() => {
    if (devbaseClient && currentUser) {
      fetchTwitterUsername();
    } else if (!currentUser) {
      setUserTwitterUsername(null);
    }
  }, [devbaseClient, currentUser]);

  


  // ✅ Rotate words for hero text
  useEffect(() => {
    const words = [
      { text: "art", color: "#e11d48" },
      { text: "business", color: "#2563eb" },
      { text: "tech", color: "#9333ea" },
      { text: "family", color: "#db2777" },
      { text: "animal", color: "#ff9200" },
      { text: "emergency", color: "#dc2626" },
      { text: "education", color: "#4f46e5" },
      { text: "sport", color: "#16a34a" },
      { text: "anything", color: "#ff9200" },
    ];
    let currentIndex = 0;
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % words.length;
      setDynamicWord(words[currentIndex].text);
      setWordColor(words[currentIndex].color);
    }, 2000);

    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (view === 'profile' || view === 'details') {
      window.scrollTo(0, 0);
    }
  }, [view]);
  const checkOAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthParams = urlParams.has('code') || urlParams.has('oauth_token') || urlParams.has('state');
    if (hasOAuthParams) {
      setTimeout(() => {
        fetchTwitterUsername();
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 1000);
    }
  };
  const fetchTwitterUsername = async () => {
    try {
      if (!devbaseClient || typeof devbaseClient.evalString !== 'function') {
        console.warn('evalString method not available');
        setUserTwitterUsername(null);
        return;
      }
      const username = await devbaseClient.evalString('$USER_X_USERNAME');
      setUserTwitterUsername(username || null);
    } catch (error) {
      console.error('Error fetching Twitter username:', error);
      setUserTwitterUsername(null);
    }
  };
    const loadCampaigns = async () => {
    try {
      const data = await devbaseClient.listEntities('campaigns');
      const campaignsWithStats = await Promise.all(data.map(async campaign => {
        const donations = await devbaseClient.listEntities('donations', {
          campaignId: campaign.id
        });
        const milestones = await devbaseClient.listEntities('milestones', {
          campaignId: campaign.id
        });
        const raised = donations.reduce((sum, d) => sum + d.amount, 0);
        return {
          ...campaign,
          raised,
          backers: donations.length,
          milestonesCount: milestones.length,
          donations // Include donations to sort by last funded
        };
      }));
      setCampaigns(campaignsWithStats);
    } catch (error) {
      console.error('Error loading campaigns:', error);
    }
  };
  const loadUserDonations = async () => {
    try {
      const donations = await devbaseClient.listEntities('donations', {
        userId: viewedUserId || currentUser
      });
      const donationsWithCampaigns = await Promise.all(donations.map(async donation => {
        const campaign = await devbaseClient.getEntity('campaigns', donation.campaignId);
        return {
          ...donation,
          campaign
        };
      }));
      setUserDonations(donationsWithCampaigns);
    } catch (error) {
      console.error('Error loading user donations:', error);
    }
  };

  const getFilteredCampaigns = () => {
    let filtered = campaigns.filter(campaign => {
      const query = searchQuery.toLowerCase();
      return campaign.title.toLowerCase().includes(query) || campaign.description.toLowerCase().includes(query);
    });

    switch (activeFilter) {
      case 'featured':
        // Filter campaigns that have at least one social link and sort by the number of social links
        return filtered.filter(campaign => campaign.websiteUrl || campaign.xUrl || campaign.telegramUrl).sort((a, b) => {
          const aSocials = [a.websiteUrl, a.xUrl, a.telegramUrl].filter(Boolean).length;
          const bSocials = [b.websiteUrl, b.xUrl, b.telegramUrl].filter(Boolean).length;
          return bSocials - aSocials; // Sort by more socials first
        });
      case 'last-funded':
        // Sort campaigns by the createdAt timestamp of their most recent donation
        return filtered.sort((a, b) => {
          const aLastDonation = a.donations?.length > 0 ? Math.max(...a.donations.map(d => d.createdAt || 0)) : 0;
          const bLastDonation = b.donations?.length > 0 ? Math.max(...b.donations.map(d => d.createdAt || 0)) : 0;
          return bLastDonation - aLastDonation; // Sort by most recent donation first
        });
      case 'just-launched':
        return filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      case 'highest-goal':
        return filtered.sort((a, b) => b.goal - a.goal);
      case 'top-gainers':
        return filtered.sort((a, b) => {
          const aProgress = a.raised / a.goal * 100;
          const bProgress = b.raised / b.goal * 100;
          return bProgress - aProgress;
        });
      default:
        return filtered;
    }
  };

  const filteredCampaigns = getFilteredCampaigns();
  const filterOptions = [{
    value: 'featured',
    label: 'Featured',
    icon: Star
  }, {
    value: 'last-funded',
    label: 'Last Funded',
    icon: Clock
  }, {
    value: 'just-launched',
    label: 'Just Launched',
    icon: Rocket
  }, {
    value: 'highest-goal',
    label: 'Highest Goal',
    icon: TrendingUp
  }, {
    value: 'top-gainers',
    label: 'Top Gainers',
    icon: Zap
  }];
  const profileFilterOptions = [{
    value: 'campaigns',
    label: 'Campaigns',
    icon: Rocket
  }, {
    value: 'donations',
    label: 'Donations',
    icon: DollarSign
  }];
  const handleFilterChange = filterValue => {
    // Preserve the current vertical scroll position
    const currentScrollY = window.scrollY;
    
    setActiveFilter(filterValue);
    if (filterScrollRef.current) {
      requestAnimationFrame(() => {
        // Restore vertical scroll position
        window.scrollTo(0, currentScrollY);
        
        const activeButton = filterScrollRef.current.querySelector(`[data-filter="${filterValue}"]`);
        if (activeButton) {
          const container = filterScrollRef.current;
          const containerRect = container.getBoundingClientRect();
          const buttonRect = activeButton.getBoundingClientRect();
          const buttonCenter = buttonRect.left + buttonRect.width / 2;
          const containerCenter = containerRect.left + containerRect.width / 2;
          const scrollOffset = buttonCenter - containerCenter;
          const newScrollLeft = container.scrollLeft + scrollOffset;
          
          // Only scroll horizontally within the filter container
          container.scrollTo({
            left: newScrollLeft,
            behavior: 'smooth'
          });
          
          // Ensure vertical position stays fixed
          window.scrollTo(0, currentScrollY);
        }
      });
    }
  };
  const handleImageUpload = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setToast({ type: 'error', message: 'Please upload an image file' });
      return;
    }
    const img = new Image();
    const reader = new FileReader();
    reader.onload = e => {
      img.src = e.target.result;
    };
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let width = img.width;
      let height = img.height;
      const maxSize = 800;
      if (width > height) {
        if (width > maxSize) {
          height = height * maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = width * maxSize / height;
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
      setNewCampaign({
        ...newCampaign,
        image: compressedBase64
      });
      setImagePreview(compressedBase64);
    };
    reader.readAsDataURL(file);
  };
  const createCampaign = async () => {
    if (!newCampaign.title || !newCampaign.description || !newCampaign.goal) return;
    setLoading(true);
    try {
      const campaign = await devbaseClient.createEntity('campaigns', {
        title: newCampaign.title,
        description: newCampaign.description,
        goal: parseFloat(newCampaign.goal),
        image: newCampaign.image,
        token: newCampaign.token,
        websiteUrl: newCampaign.websiteUrl,
        xUrl: newCampaign.xUrl,
        telegramUrl: newCampaign.telegramUrl
      });
      for (const milestone of newCampaign.milestones) {
        await devbaseClient.createEntity('milestones', {
          campaignId: campaign.id,
          description: milestone.description,
          targetAmount: parseFloat(milestone.targetAmount),
          completed: false
        });
      }
      await loadCampaigns();
      setIsCreating(false);
      setNewCampaign({
        title: '',
        description: '',
        goal: '',
        image: '',
        token: 'SOL',
        milestones: [],
        websiteUrl: '',
        xUrl: '',
        telegramUrl: ''
      });
      setImagePreview('');
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
    setLoading(false);
  };
  
  const loadCampaignDetails = async campaignId => {
    try {
      const campaign = await devbaseClient.getEntity('campaigns', campaignId);
      const donations = await devbaseClient.listEntities('donations', {
        campaignId
      });
      const milestones = await devbaseClient.listEntities('milestones', {
        campaignId
      });
      const raised = donations.reduce((sum, d) => sum + d.amount, 0);
      setSelectedCampaign({
        ...campaign,
        raised,
        backers: donations.length,
        donations,
        milestones
      });
      setView('details');
    } catch (error) {
      console.error('Error loading campaign details:', error);
    }
  };
  const completeMilestone = async milestoneId => {
    setLoading(true);
    try {
      await devbaseClient.updateEntity('milestones', milestoneId, {
        completed: true
      });
      await devbaseClient.createEntity('withdrawals', {
        milestoneId
      });
      await loadCampaignDetails(selectedCampaign.id);
    } catch (error) {
      console.error('Error completing milestone:', error);
    }
    setLoading(false);
  };
  const addMilestone = () => {
    if (!newMilestone.description || !newMilestone.targetAmount) return;
    setNewCampaign({
      ...newCampaign,
      milestones: [...newCampaign.milestones, {
        ...newMilestone
      }]
    });
    setNewMilestone({
      description: '',
      targetAmount: ''
    });
  };
  const removeMilestone = index => {
    setNewCampaign({
      ...newCampaign,
      milestones: newCampaign.milestones.filter((_, i) => i !== index)
    });
  };
  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?campaign=${selectedCampaign?.id}`;
    navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };
  const shareOnX = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?campaign=${selectedCampaign?.id}`;
    const text = `Check out this campaign: ${selectedCampaign?.title}`;
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(xUrl, '_blank');
  };
  return (
    // Force re-render of entire app when connected changes
    <div key={String(connected)} className="min-h-screen bg-page text-gray-900">
      {DEBUG && <DebugPanel />}
      <style>{`
        .wallet-adapter-modal-wrapper {
          background-color: #16181d !important;
          border-radius: 8px !important;
        }
        .wallet-adapter-modal-wrapper .wallet-adapter-button:hover {
          background-color: #33373d !important;
        }
        .wallet-adapter-modal-list .wallet-adapter-button {
          border-radius: 8px !important;
        }
        .wallet-adapter-button {
          justify-content: center !important;
          color: #545454 !important;
          font-weight: 500 !important;
        }
        .wallet-adapter-dropdown-list {
          box-shadow: none !important;
          border-radius: 8px !important;
          background-color: #fff !important;
        }
@media (max-width: 767px) {
    .wallet-adapter-dropdown-list {
      position: absolute !important;
      transition: none !important;
    }
    .wallet-adapter-dropdown-list.wallet-adapter-dropdown-list-active {
      position: static !important;
    }
    .wallet-adapter-dropdown:has(.wallet-adapter-dropdown-list-active) {
      padding-bottom: 10px;
    }
    /* Hide "Change Wallet" and "Copy Address" on mobile - only show "Disconnect" */
    .wallet-adapter-dropdown-list-item:first-child,
    .wallet-adapter-dropdown-list-item:nth-child(2) {
      display: none !important;
    }
  }
        .wallet-adapter-dropdown-list-item {
          color: #545454 !important;
          font-weight: 500 !important;
        }
        .wallet-adapter-dropdown-list-item:not([disabled]):hover {
          background-color: #d9d9d9 !important;
        }
      `}</style>
      <nav className="backdrop-blur-xl bg-page relative z-50">
        {DEBUG && (
          <>
            {/* DEBUG: display wallet/connect state for quick inspection */}
            <div className="fixed top-4 right-4 z-[999] bg-white/90 border px-3 py-2 rounded-md text-xs text-gray-800 shadow">
              <div>connected: {String(connected)}</div>
              <div>publicKey: {publicKey ? publicKey.toBase58().slice(0,6) + '...' : 'null'}</div>
              <div>currentUser: {currentUser ? String(currentUser).slice(0,8) + '...' : 'null'}</div>
              <div>wallet.name: {wallet?.name || 'null'}</div>
              <div>wallet.readyState: {wallet?.readyState || 'null'}</div>
              <div>available wallets: {wallets?.length ? wallets.map(w=>w.name).join(', ') : 'none'}</div>
              <div>window.solana: {typeof window !== 'undefined' && window.solana ? (window.solana.isPhantom ? 'phantom' : 'present') : 'none'}</div>
            </div>
            <div className="fixed top-24 right-4 z-[999] bg-white/90 border px-3 py-2 rounded-md text-xs text-gray-800 shadow">
            <div className="mb-2">Debug actions:</div>
            <button onClick={async () => {
              console.log('[DEBUG BUTTON] wallet object:', wallet);
              console.log('[DEBUG BUTTON] wallet.name:', wallet?.name);
              console.log('[DEBUG BUTTON] wallet.readyState:', wallet?.readyState);
              console.log('[DEBUG BUTTON] window.solana:', typeof window !== 'undefined' ? window.solana : undefined);
              try {
                await connect();
                console.log('[DEBUG BUTTON] connect() returned');
              } catch (e) {
                console.error('[DEBUG BUTTON] connect() error', e);
              }
            }} className="mb-1 px-2 py-1 bg-blue-500 text-white rounded text-sm">Programmatic Connect</button>
              <button onClick={async () => {
                console.log('[DEBUG BUTTON] Selecting Phantom (if available) and connecting...');
                try {
                  const phantom = wallets?.find(w => w?.name?.toLowerCase().includes('phantom'));
                  console.log('[DEBUG BUTTON] wallets:', wallets?.map(w => w.name));
                  if (phantom && select) {
                    console.log('[DEBUG BUTTON] selecting', phantom.name);
                    select(phantom.name);
                  }
                  await connect();
                  console.log('[DEBUG BUTTON] select+connect returned');
                } catch (e) {
                  console.error('[DEBUG BUTTON] select+connect error', e);
                }
              }} className="mb-1 ml-2 px-2 py-1 bg-green-600 text-white rounded text-sm">Select Phantom & Connect</button>
            <button onClick={async () => {
              try {
                await disconnect();
                console.log('[DEBUG BUTTON] disconnect() returned');
              } catch (e) {
                console.error('[DEBUG BUTTON] disconnect() error', e);
              }
            }} className="px-2 py-1 bg-red-500 text-white rounded text-sm">Programmatic Disconnect</button>
          </div>
          </>
        )}
        <div className="max-w-8xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => {
          setView('home');
          setSelectedCampaign(null);
        }}>
            <img src="/Dropfund logo drop lines 2.png" alt="DropFund" className="w-10 h-10 rounded-lg" />
            <span className="text-2xl font-bold text-black">DropFund</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <button onClick={() => setView('getting-started')} className="text-gray-600 hover:text-black transition-colors font-medium">
              Getting Started
            </button>
            {connected && publicKey && <>
            <button onClick={() => {
              setViewedUserId(publicKey.toBase58());
              setView('profile');
            }} className="text-gray-600 hover:text-black transition-colors font-medium">
              Profile
            </button>
              <button onClick={() => setIsCreating(true)} className="px-6 py-2.5 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-all flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Launch Campaign
            </button>
          </>}
          <div className={`hidden md:inline-block ${connected && publicKey ? '[&_button]:!bg-transparent [&_button]:hover:!bg-transparent [&_button_span]:hidden [&_button_svg]:!text-gray-900' : '[&_button_span]:font-medium [&_button]:!bg-[#fff] [&_button]:!rounded-[50px] [&_button]:hover:!opacity-70 [&_button]:transition-opacity'}`}>
            <UserButton />
          </div>
          <div className={`md:hidden ${connected && publicKey ? '[&_button]:!bg-transparent [&_button]:hover:!bg-transparent [&_button_span]:hidden [&_button_svg]:!text-gray-900' : '[&_button_span]:font-medium [&_button]:!bg-[#ebebeb] [&_button]:!rounded-[50px] [&_button]:hover:!opacity-70 [&_button]:transition-opacity'}`}>
            <UserButton />
          </div>
        </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-all relative z-[70]">
            <Menu className="w-6 h-6 text-gray-900" />
          </button>
        </div>
      </nav>
      <div className={`fixed inset-0 bg-black/50 z-[60] md:hidden transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMobileMenuOpen(false)} />
      <div className={`fixed top-20 right-4 w-72 bg-white rounded-2xl shadow-2xl z-[100] md:hidden transition-all duration-200 ${mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
          <div className="p-3">
            <div className="flex flex-col gap-1">
              <button onClick={() => {
            setView('getting-started');
            setMobileMenuOpen(false);
          }} className="w-full px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 rounded-lg transition-all text-center font-medium">
                Getting Started
              </button>
              {connected && publicKey && <>
            <button onClick={() => {
              setViewedUserId(publicKey.toBase58());
              setView('profile');
              setMobileMenuOpen(false);
            }} className="w-full px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 rounded-lg transition-all text-center font-medium">
                    Profile
                  </button>
                  <button onClick={() => {
              setIsCreating(true);
              setMobileMenuOpen(false);
            }} className="w-full px-4 py-3 bg-blue-500 text-white rounded-full transition-all flex items-center justify-center gap-3 font-semibold hover:bg-blue-600">
                    <Plus className="w-5 h-5" />
                    Launch Campaign
                  </button>
                  
                </>}
              <div onClick={(e) => e.stopPropagation()} className={`w-full ${connected && publicKey ?'[&_button]:!bg-transparent [&_button]:hover:!bg-transparent [&_button_span]:hidden [&_button_svg]:!text-gray-900 [&>*]:!w-full [&_button]:!w-full [&_.wallet-adapter-button-trigger]:!w-full [&_.wallet-adapter-button-trigger_button]:!w-full [&_.wallet-adapter-dropdown]:!w-full [&_.wallet-adapter-dropdown-list]:!w-full [&_button]:!justify-center [&_button]:!px-4' : '[&_button_span]:font-medium [&_button]:!bg-[#ebebeb] [&_button]:!rounded-[50px] [&_button]:hover:!opacity-70 [&_button]:transition-opacity [&>*]:!w-full [&_button]:!w-full [&_.wallet-adapter-button-trigger]:!w-full [&_.wallet-adapter-button-trigger_button]:!w-full [&_.wallet-adapter-dropdown]:!w-full [&_.wallet-adapter-dropdown-list]:!w-full'}`}>
                <UserButton />
              </div>
            </div>
          </div>
        </div>
      <div className="max-w-8xl mx-auto px-6 py-12">
        {view === 'getting-started' && <div>
            <div className="max-w-4xl mx-auto">
              <button onClick={() => setView('home')} className="text-blue-500 hover:text-blue-600 mb-6 flex items-center gap-2">
                ← Back to home
              </button>
              <h1 className="text-[2rem] md:text-5xl font-bold mb-4 text-black">
                Getting Started Guide
              </h1>
              <p className="text-xl text-gray-600 mb-12">
                New to crypto? No worries! Follow these simple steps to start funding dreams on the blockchain.
              </p>
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-8">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold text-white">
                        1
                      </div>
                      <h3 className="text-2xl font-bold text-black">Download Phantom Wallet</h3>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-4">
                        Phantom is a secure digital wallet that lets you manage your crypto and connect to apps like DropFund.
                      </p>
                      <div className="bg-gray-100 rounded-xl p-4 mb-4">
                        <h4 className="font-semibold mb-2 text-black">📱 For Mobile:</h4>
                        <ul className="text-gray-600 space-y-1 ml-4">
                          <li>• Visit the App Store (iOS) or Google Play (Android)</li>
                          <li>• Search for {`"Phantom - Crypto Wallet"`}</li>
                          <li>• Download and install the app</li>
                        </ul>
                      </div>
                      <div className="bg-gray-100 rounded-xl p-4">
                        <h4 className="font-semibold mb-2 text-black">💻 For Desktop:</h4>
                        <ul className="text-gray-600 space-y-1 ml-4">
                          <li>• Visit <a href="https://phantom.app" target="_blank" className="text-blue-500 hover:text-blue-600">phantom.app</a></li>
                          <li>• Click {`"Download"`} and select your browser</li>
                          <li>• Install the browser extension</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-8">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold text-white">
                        2
                      </div>
                      <h3 className="text-2xl font-bold text-black">Create Your Wallet</h3>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-4">
                        Once Phantom is installed, you'll need to create your wallet. This is like opening a digital bank account.
                      </p>
                      <div className="bg-gray-100 rounded-xl p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500">→</span>
                          <p className="text-gray-600">Open Phantom and click {`"Create New Wallet"`}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500">→</span>
                          <p className="text-gray-600">Write down your secret recovery phrase (12 words) and keep it VERY safe - this is your key!</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500">→</span>
                          <p className="text-gray-600">Set a password for quick access</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500">→</span>
                          <p className="text-gray-600">Your wallet is ready! 🎉</p>
                        </div>
                      </div>
                      <div className="mt-4 bg-yellow-50 rounded-xl p-4">
                        <p className="text-yellow-800 text-sm">
                          ⚠️ <strong>Important:</strong> Never share your recovery phrase with anyone. Phantom will never ask for it!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-8">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold text-white">
                        3
                      </div>
                      <h3 className="text-2xl font-bold text-black">Get Some SOL</h3>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-4">
                        SOL is the cryptocurrency used on Solana (the blockchain powering DropFund). You'll need some to donate or create campaigns.
                      </p>
                      <div className="bg-gray-100 rounded-xl p-4 space-y-3">
                        <div>
                          <h4 className="font-semibold mb-2 text-black">Option 1: Buy in Phantom</h4>
                          <p className="text-gray-600 text-sm">Open Phantom → Click {`"Buy"`} → Choose amount → Complete purchase with card</p>
                        </div>
                        <div className="h-px bg-gray-200"></div>
                        <div>
                          <h4 className="font-semibold mb-2 text-black">Option 2: Buy from Exchange</h4>
                          <p className="text-gray-600 text-sm">Use Coinbase, Binance, or Kraken → Buy SOL → Send to your Phantom wallet address</p>
                        </div>
                      </div>
                      <div className="mt-4 bg-blue-50 rounded-xl p-4">
                        <p className="text-blue-800 text-sm">
                          💡 <strong>Tip:</strong> Start small! You can donate or create campaigns with as little as 0.1 SOL
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-8">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold text-white">
                        4
                      </div>
                      <h3 className="text-2xl font-bold text-black">Connect to DropFund</h3>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-4">
                        Now you're ready to connect your wallet and start funding dreams!
                      </p>
                      <div className="bg-gray-100 rounded-xl p-4 space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500">→</span>
                          <p className="text-gray-600">Click the {`"Connect Wallet"`} button in the top right</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500">→</span>
                          <p className="text-gray-600">Select Phantom from the wallet options</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500">→</span>
                          <p className="text-gray-600">Approve the connection in Phantom</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-blue-500">→</span>
                          <p className="text-gray-600">{`You're in! Start exploring campaigns or create your own`}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-8">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-xl font-bold text-white">
                        5
                      </div>
                      <h3 className="text-2xl font-bold text-black">Create or Back a Campaign</h3>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-4">
                        {`You're all set! Here's what you can do:`}
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-gray-100 rounded-xl p-4">
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-black">
                            <Rocket className="w-5 h-5 text-blue-500" />
                            Launch a Campaign
                          </h4>
                          <p className="text-gray-600 text-sm mb-3">
                            Click {`"Launch Campaign"`}, fill in details, set milestones, and share your vision with the world!
                          </p>
                        </div>
                        <div className="bg-gray-100 rounded-xl p-4">
                          <h4 className="font-semibold mb-2 flex items-center gap-2 text-black">
                            <DollarSign className="w-5 h-5 text-blue-500" />
                            Back a Project
                          </h4>
                          <p className="text-gray-600 text-sm mb-3">
                            Browse campaigns, pick one you love, enter amount, and boom - your donation is on-chain!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-12 bg-white rounded-2xl p-8 text-center">
                <h3 className="text-2xl font-bold mb-3 text-black">Ready to Start?</h3>
                <p className="text-gray-600 mb-6">
                  Jump into the world of transparent, blockchain-powered crowdfunding!
                </p>
                <button onClick={() => setView('home')} className="px-8 py-3 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-all inline-flex items-center gap-2">
                  Explore Campaigns
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>}
        {view === 'terms' && <div>
            <div className="max-w-4xl mx-auto">
              <button onClick={() => setView('home')} className="text-blue-500 hover:text-blue-600 mb-6 flex items-center gap-2">
                ← Back to home
              </button>
              <h1 className="text-[2rem] md:text-5xl font-bold mb-4 text-black">
                TERMS OF USE
              </h1>
              <p className="text-sm text-gray-500 mb-12">
                Last Updated: 11 November 2025
              </p>
              <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
                <p>
                  These Terms of Use ("Terms") constitute a legally binding agreement between you ("you" or "your") and DropFund ("DropFund", "we", "our", or "us").
                </p>
                <p>
                  By accessing or using the DropFund website, smart-contracts, or any connected tools (collectively, the "Platform"), you agree that you have read, understood, and accepted these Terms. If you do not agree, do not access or use the Platform.
                </p>
                
                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">1. Overview</h2>
                <p>
                  DropFund is a decentralized fundraising protocol built on the Solana blockchain. It enables creators to publish campaigns and receive direct, wallet-to-wallet donations.
                </p>
                <p>
                  Each donation transaction executes on-chain and includes a 1% protocol fee, automatically routed to DropFund's fee address.
                </p>
                <p>
                  DropFund does not take custody of user funds and does not guarantee campaign outcomes. All donations are final and non-refundable.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">2. Eligibility</h2>
                <p>You may use the Platform only if:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>You are at least 18 years old;</li>
                  <li>You have full legal capacity to enter into these Terms;</li>
                  <li>Your use complies with applicable laws in your jurisdiction;</li>
                  <li>You are not located in, or a resident of, any sanctioned or prohibited country (including Cuba, Iran, North Korea, Syria, or Russia).</li>
                </ul>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">3. Platform Use</h2>
                <p>
                  You acknowledge that DropFund is a non-custodial, smart-contract interface. When you make or receive a donation, you interact directly with the Solana blockchain through your connected wallet.
                </p>
                <p>
                  DropFund does not have access to or control over your private keys, funds, or transactions. You are solely responsible for safeguarding your wallet and verifying all on-chain actions before approving them.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">4. Campaigns</h2>
                <p>Creators can launch campaigns through the DropFund interface.</p>
                <p>Campaign data (title, description, media links, goals) is stored off-chain in decentralized or third-party storage.</p>
                <p>Donations are executed directly from donor wallets to creator wallets, plus the 1% protocol fee.</p>
                <p>In the future, DropFund may introduce optional milestone-based vaults for creators who prefer staged fund releases.</p>
                <p>DropFund does not vet, endorse, or verify campaigns or their creators. You donate at your own discretion and risk.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">5. Protocol Fees</h2>
                <p>
                  Each donation processed through DropFund smart-contracts includes a 1% protocol fee, automatically distributed to DropFund's fee wallet.
                </p>
                <p>
                  This fee supports maintenance, development, and operational costs of the protocol. It is applied transparently at the transaction level and cannot be reversed.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">6. Transactions and Smart-Contract Risks</h2>
                <p>All actions on the Platform are final and irreversible once recorded on the Solana blockchain.</p>
                <p>By using DropFund, you understand that:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Transactions may fail, be delayed, or cost variable gas fees.</li>
                  <li>You may lose access to funds if you lose your private keys or approve a malicious transaction.</li>
                  <li>The smart-contracts may contain bugs or experience exploits beyond our control.</li>
                </ul>
                <p>DropFund assumes no liability for technical failures, blockchain congestion, or losses due to user error or third-party integrations.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">7. No Financial or Investment Advice</h2>
                <p>DropFund does not provide financial, legal, or investment advice.</p>
                <p>Donations are voluntary and do not constitute investments, securities, or ownership stakes in any project.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">8. Intellectual Property</h2>
                <p>The DropFund name, logo, website content, and software code are owned or licensed by DropFund.</p>
                <p>Users retain ownership of their campaign content but grant DropFund a non-exclusive, royalty-free license to display it for Platform functionality and promotion.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">9. Privacy & Data</h2>
                <p>DropFund collects minimal information necessary to operate the Platform (such as wallet addresses, campaign metadata, and analytics).</p>
                <p>We do not collect personal identifiers, custody user funds, or sell user data.</p>
                <p>More details are provided in our Privacy Policy.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">10. Limitation of Liability</h2>
                <p>DropFund and its contributors are not liable for:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Any loss of funds, opportunities, or goodwill arising from your use of the Platform;</li>
                  <li>Smart-contract bugs, blockchain downtime, or wallet mismanagement;</li>
                  <li>Misrepresentation or failure of any campaign creator;</li>
                  <li>Any indirect, incidental, or consequential damages.</li>
                </ul>
                <p>To the maximum extent permitted by law, DropFund's total liability shall not exceed the total protocol fees received from your transactions.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">11. Indemnification</h2>
                <p>You agree to defend, indemnify, and hold harmless DropFund, its contributors, and affiliates from any claims, liabilities, or damages arising out of your use of the Platform, violation of these Terms, or breach of applicable laws.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">12. Changes to the Platform or Terms</h2>
                <p>DropFund may modify or discontinue features, and update these Terms at any time.</p>
                <p>The "Last Updated" date reflects the current version. Continued use constitutes acceptance of revised Terms.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">13. Jurisdiction & Governing Law</h2>
                <p>These Terms are governed by and construed in accordance with the laws of the British Virgin Islands (BVI).</p>
                <p>Any dispute shall be resolved by binding arbitration in Tortola, BVI, in English, under the BVI Arbitration Act 2013. Class actions are expressly waived.</p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">14. Contact</h2>
                <p>If you have questions about these Terms, you may contact the DropFund team through our official channels, which will be announced on the website.</p>
              </div>
            </div>
          </div>}
        {view === 'privacy' && <div>
            <div className="max-w-4xl mx-auto">
              <button onClick={() => setView('home')} className="text-blue-500 hover:text-blue-600 mb-6 flex items-center gap-2">
                ← Back to home
              </button>
              <h1 className="text-[2rem] md:text-5xl font-bold mb-4 text-black">
                PRIVACY POLICY
              </h1>
              <p className="text-sm text-gray-500 mb-12">
                Last Updated: 11 November 2025
              </p>
              <div className="prose prose-lg max-w-none text-gray-700 space-y-6">
                <p>
                  This Privacy Policy explains how DropFund ("we", "us", "our") collects, uses, and protects limited information from users ("you") who access our Platform.
                </p>
                <p>
                  By using DropFund, you consent to this Policy.
                </p>
                
                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">1. Overview</h2>
                <p>
                  DropFund is a decentralized application (dApp) that processes donations directly on the Solana blockchain.
                </p>
                <p>
                  We do not store or control user funds, private keys, or personal identifiers.
                </p>
                <p>
                  Any information collected is for functional and analytical purposes only.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">2. Information We Collect</h2>
                <p>We may collect:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Wallet addresses used to interact with the Platform;</li>
                  <li>Campaign data you submit (title, image links, description, goal, URLs);</li>
                  <li>Transaction data publicly available on-chain;</li>
                  <li>Usage analytics (browser type, device, referrer, basic performance metrics).</li>
                </ul>
                <p>
                  We do not collect names, emails, or government IDs unless you voluntarily contact us for support.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">3. Cookies and Analytics</h2>
                <p>
                  We may use essential cookies or privacy-preserving analytics tools to improve Platform performance.
                </p>
                <p>
                  No tracking or targeted advertising is conducted.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">4. Data Storage</h2>
                <p>
                  Campaign metadata and related information may be stored via third-party decentralized or cloud providers (e.g., IPFS, DevFun, or similar).
                </p>
                <p>
                  DropFund does not store private keys, seed phrases, or transaction signatures.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">5. How We Use Data</h2>
                <p>Collected data is used to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Display and organize campaigns and donations;</li>
                  <li>Monitor Platform health and prevent abuse;</li>
                  <li>Support future feature development (e.g., milestone vaults);</li>
                  <li>Comply with applicable laws if required.</li>
                </ul>
                <p>
                  We do not sell, rent, or trade user data.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">6. Sharing and Disclosure</h2>
                <p>We may share limited, non-personal data with:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Infrastructure partners (e.g., RPC providers, IPFS nodes);</li>
                  <li>Analytics or security vendors under confidentiality terms;</li>
                  <li>Regulators or law enforcement when legally required.</li>
                </ul>
                <p>
                  We do not share any private user data for marketing or advertising.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">7. Blockchain Transparency</h2>
                <p>
                  All donations occur on the public Solana blockchain, meaning your wallet address and transaction details are publicly viewable.
                </p>
                <p>
                  DropFund cannot alter or delete blockchain data.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">8. Data Retention</h2>
                <p>
                  We retain off-chain metadata only as long as necessary for platform functionality or legal compliance, after which it may be deleted or anonymized.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">9. Security</h2>
                <p>
                  DropFund employs standard encryption, access control, and secure hosting.
                </p>
                <p>
                  However, blockchain transactions are inherently public and irreversible — please use caution when sharing wallet information.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">10. Minors</h2>
                <p>
                  DropFund is not intended for individuals under 18. We do not knowingly collect data from minors.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">11. International Use</h2>
                <p>
                  DropFund operates globally. By using it, you consent to data transfer and processing in other jurisdictions, including the United States and the British Virgin Islands.
                </p>

                <h2 className="text-2xl font-bold mt-8 mb-4 text-black">12. Updates to this Policy</h2>
                <p>
                  We may update this Privacy Policy periodically. Continued use after updates constitutes acceptance of the new version.
                </p>
              </div>
            </div>
          </div>}
        {view === 'home' && <div className="pt-6 md:pt-12">
            <div className="text-center mb-16">
              <h1 className="text-[4rem] md:text-[8rem] font-bold mb-6 leading-none">
                <span className="text-gray-900">Fund</span>
                <br className="md:hidden" />
                {' '}
                <span style={{
              color: wordColor
            }}>{dynamicWord}</span>
                <br />
                <span className="text-gray-900">onchain</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
                Transparent crowdfunding powered by solana. Get funds fast, anywhere in the world.
              </p>
              {connected && publicKey ? <button onClick={() => setIsCreating(true)} className="px-6 py-2.5 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-all inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Launch Campaign
                </button> : <div className="flex justify-center [&_button]:!bg-[#fff] [&_button]:!rounded-[50px] [&_button]:hover:!opacity-70 [&_button]:transition-opacity">
                  <UserButton />
                </div>}
            </div>
            <div className="mb-20 mt-20" style={{ marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}>
              <div className="overflow-x-scroll scrollbar-hide md:overflow-x-auto" style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          scrollSnapType: 'x mandatory'
        }}>
                <div className="inline-grid grid-flow-col auto-cols-[300px] md:auto-cols-[340px] gap-6 pb-4 md:pb-0" style={{
            paddingLeft: 'max(24px, calc((100vw - 1440px) / 2 + 24px))',
            paddingRight: 'max(24px, calc((100vw - 1440px) / 2 + 24px))'
          }}>
                <div className="bg-gray-200 p-8 flex flex-col" style={{
              scrollSnapAlign: 'center',
              borderRadius: '2rem'
            }}>
                  <div className="w-12 h-12 mb-6">
                    <Globe className="w-12 h-12 text-black" strokeWidth={1} />
                  </div>
                  <h3 className="text-xl font-bold text-black mb-3">Global Access</h3>
                  <p className="text-base text-gray-600 mb-6">Fund anything. From anyone. Instantly. No banks, no borders.</p>
                  <button onClick={() => { setSelectedFeature('global'); setShowFeatureModal(true); }} className="mt-auto w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <Plus className="w-5 h-5 text-black" strokeWidth={1} />
                  </button>
                </div>
                <div className="bg-gray-200 p-8 flex flex-col" style={{
              scrollSnapAlign: 'center',
              borderRadius: '2rem'
            }}>
                  <div className="w-12 h-12 mb-6">
                    <DollarSign className="w-12 h-12 text-black" strokeWidth={1} />
                  </div>
                  <h3 className="text-xl font-bold text-black mb-3">Crypto Native</h3>
                  <p className="text-base text-gray-600 mb-6">Accept SOL from anywhere. Near-zero payment processor fees.</p>
                  <button onClick={() => { setSelectedFeature('crypto'); setShowFeatureModal(true); }} className="mt-auto w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <Plus className="w-5 h-5 text-black" strokeWidth={1} />
                  </button>
                </div>
                <div className="bg-gray-200 p-8 flex flex-col" style={{
              scrollSnapAlign: 'center',
              borderRadius: '2rem'
            }}>
                  <div className="w-12 h-12 mb-6">
                    <Eye className="w-12 h-12 text-black" strokeWidth={1} />
                  </div>
                  <h3 className="text-xl font-bold text-black mb-3">Full Transparency</h3>
                  <p className="text-base text-gray-600 mb-6">Every transaction on-chain. See exactly where funds go.</p>
                  <button onClick={() => { setSelectedFeature('transparency'); setShowFeatureModal(true); }} className="mt-auto w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <Plus className="w-5 h-5 text-black" strokeWidth={1} />
                  </button>
                </div>
                <div className="bg-gray-200 p-8 flex flex-col" style={{
              scrollSnapAlign: 'center',
              borderRadius: '2rem'
            }}>
                  <div className="w-12 h-12 mb-6">
                    <Zap className="w-12 h-12 text-black" strokeWidth={1} />
                  </div>
                  <h3 className="text-xl font-bold text-black mb-3">Lightning Fast</h3>
                  <p className="text-base text-gray-600 mb-6">Built on Solana. Transactions confirmed in seconds, not minutes.</p>
                  <button onClick={() => { setSelectedFeature('fast'); setShowFeatureModal(true); }} className="mt-auto w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <Plus className="w-5 h-5 text-black" strokeWidth={1} />
                  </button>
                </div>
                <div className="bg-gray-200 p-8 flex flex-col" style={{
              scrollSnapAlign: 'center',
              borderRadius: '2rem'
            }}>
                  <div className="w-12 h-12 mb-6">
                    <Shield className="w-12 h-12 text-black" strokeWidth={1} />
                  </div>
                  <h3 className="text-xl font-bold text-black mb-3">Secure & Trustless</h3>
                  <p className="text-base text-gray-600 mb-6">Smart contracts ensure funds are safe. No intermediaries needed.</p>
                  <button onClick={() => { setSelectedFeature('secure'); setShowFeatureModal(true); }} className="mt-auto w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors">
                    <Plus className="w-5 h-5 text-black" strokeWidth={1} />
                  </button>
                </div>
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-6 text-black text-center">Active Campaigns</h2>
            <div className="sticky top-0 z-40 bg-page pb-4 -mx-6 px-6 md:px-0">
              <div className="mb-4 pt-4">
                <div className="relative max-w-2xl mx-auto">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search campaigns..." className="w-full pl-12 pr-4 py-3 bg-white border border-transparent rounded-full focus:border-blue-500 focus:outline-none text-black placeholder-gray-400" />
                </div>
              </div>
              <div className="-mx-6 md:mx-0">
                <div ref={filterScrollRef} className="overflow-x-auto scrollbar-hide md:flex md:justify-center px-6 md:px-0" style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
                  <div className="inline-flex gap-2">
                    {filterOptions.map(option => <button key={option.value} type="button" data-filter={option.value} onClick={() => handleFilterChange(option.value)} className={`px-4 py-2 rounded-full font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${activeFilter === option.value ? 'bg-blue-500 text-white shadow-md' : 'bg-transparent text-gray-600 hover:text-gray-900'}`}>
                      <option.icon className="w-4 h-4" />
                      <span className="text-sm">{option.label}</span>
                    </button>)}
                  </div>
                </div>
              </div>
            </div>
            {filteredCampaigns.length === 0 ? <div className="text-center py-20">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                  <Rocket className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-xl text-gray-600">
                  {searchQuery ? 'No campaigns match your search.' : 'No campaigns yet. Be the first to launch!'}
                </p>
              </div> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map(campaign => {
            const progress = campaign.raised / campaign.goal * 100;
            return <div key={campaign.id} className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all group relative flex flex-row md:flex-col">
                      {campaign.image && <div className="w-32 aspect-square md:w-full md:h-64 md:aspect-auto overflow-hidden cursor-pointer flex-shrink-0 self-stretch" onClick={() => loadCampaignDetails(campaign.id)}>
                        <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>}
                      <div className="p-4 md:p-6 cursor-pointer flex-1 flex flex-col" onClick={() => loadCampaignDetails(campaign.id)}>
                        <h3 className="text-base md:text-xl font-bold mb-2 md:mb-3 text-black">
                          {campaign.title}
                        </h3>
                        <div className="mb-3 md:mb-4 mt-auto">
                          <div className="flex justify-between mb-2">
                            <span className="text-xs md:text-sm text-gray-500">{progress.toFixed(1)}% funded</span>
                            <span className="text-xs md:text-sm font-semibold text-black">{campaign.raised.toFixed(2)} / {campaign.goal} {campaign.token || 'SOL'}</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full transition-all duration-500" style={{
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: '#58d16e'
                    }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs md:text-sm">
                          <div className="flex items-center gap-2 text-gray-500">
                            <Users className="w-3 h-3 md:w-4 md:h-4" />
                            {campaign.backers} backers
                          </div>
                          <div className="flex items-center gap-1">
                            {campaign.milestonesCount > 0 && <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center" title={`${campaign.milestonesCount} milestone${campaign.milestonesCount !== 1 ? 's' : ''}`}>
                              <Target className="w-3 h-3 text-blue-600" />
                            </div>}
                            {(campaign.websiteUrl || campaign.xUrl || campaign.telegramUrl) && <>
                              {campaign.websiteUrl && <a href={campaign.websiteUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors" title="Website">
                                  <Globe className="w-3 h-3 text-gray-700" />
                                </a>}
                              {campaign.xUrl && <a href={campaign.xUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors" title="Twitter">
                                  <span className="text-xs text-gray-700">𝕏</span>
                                </a>}
                              {campaign.telegramUrl && <a href={campaign.telegramUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors" title="Telegram">
                                  <Send className="w-3 h-3 text-gray-700" />
                                </a>}
                            </>}
                          </div>
                        </div>
                      </div>
                    </div>;
          })}
              </div>}
          </div>}
        {view === 'profile' && <div>
            <button onClick={() => {
          setView('home');
          setViewedUserId(null);
        }} className="text-blue-500 hover:text-blue-600 flex items-center gap-2 mb-6">
              ← Back to home
        </button>
    <div className="mb-8">
      {(viewedUserId || currentUser) && <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {(viewedUserId || currentUser).slice(0, 4)}...{(viewedUserId || currentUser).slice(-4)}
                  </span>
                </div>}
              <div className="mb-8 -mx-6 md:mx-0">
                <div className="overflow-x-auto scrollbar-hide md:flex md:justify-center px-6 md:px-0" style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}>
                  <div className="inline-flex gap-2">
                        {profileFilterOptions.map(option => <button key={option.value} type="button" onClick={() => setProfileFilter(option.value)} className={`px-4 py-2 rounded-full font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${profileFilter === option.value ? 'bg-blue-500 text-white shadow-md' : 'bg-transparent text-gray-600 hover:text-gray-900'}`}>
                        <option.icon className="w-4 h-4" />
                        <span className="text-sm">{option.label}</span>
                      </button>)}
                  </div>
                </div>
              </div>
            </div>
            {profileFilter === 'campaigns' ? <>
              {userCampaigns.length === 0 ? <div className="text-center py-20">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                    <Rocket className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-xl text-gray-600 mb-4">You haven't created any campaigns yet</p>
                  {!viewedUserId && <button onClick={() => setIsCreating(true)} className="px-6 py-3 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-all inline-flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Launch Your First Campaign
                    </button>}
                </div> : <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userCampaigns.map(campaign => {
              const progress = campaign.raised / campaign.goal * 100;
              return <div key={campaign.id} className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all group relative flex flex-row md:flex-col">
                        {campaign.image && <div className="w-32 aspect-square md:w-full md:h-64 md:aspect-auto overflow-hidden cursor-pointer flex-shrink-0 self-stretch" onClick={() => loadCampaignDetails(campaign.id)}>
                          <img src={campaign.image} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>}
                        <div className="p-4 md:p-6 cursor-pointer flex-1 flex flex-col" onClick={() => loadCampaignDetails(campaign.id)}>
                          <h3 className="text-base md:text-xl font-bold mb-2 md:mb-3 text-black">
                            {campaign.title}
                          </h3>
                          <div className="mb-3 md:mb-4 mt-auto">
                            <div className="flex justify-between mb-2">
                              <span className="text-xs md:text-sm text-gray-500">{progress.toFixed(1)}% funded</span>
                              <span className="text-xs md:text-sm font-semibold text-black">{campaign.raised.toFixed(2)} / {campaign.goal} {campaign.token || 'SOL'}</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full transition-all duration-500" style={{
                        width: `${Math.min(progress, 100)}%`,
                        backgroundColor: '#58d16e'
                      }} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs md:text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                              <Users className="w-3 h-3 md:w-4 md:h-4" />
                              {campaign.backers} backers
                            </div>
                    <div className="flex items-center gap-1">
                              {campaign.milestonesCount > 0 && <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center" title={`${campaign.milestonesCount} milestone${campaign.milestonesCount !== 1 ? 's' : ''}`}>
                                <Target className="w-3 h-3 text-blue-600" />
                              </div>}
                              {(campaign.websiteUrl || campaign.xUrl || campaign.telegramUrl) && <>
                                {campaign.websiteUrl && <a href={campaign.websiteUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors" title="Website">
                                    <Globe className="w-3 h-3 text-gray-700" />
                                  </a>}
                                {campaign.xUrl && <a href={campaign.xUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors" title="Twitter">
                                    <span className="text-xs text-gray-700">𝕏</span>
                                  </a>}
                                {campaign.telegramUrl && <a href={campaign.telegramUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors" title="Telegram">
                                    <Send className="w-3 h-3 text-gray-700" />
                                  </a>}
                              </>}
                            </div>
                          </div>
                        </div>
                      </div>;
            })}
                </div>}
            </> : <>
              {userDonations.length === 0 ? <div className="text-center py-20">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-xl text-gray-600">No donations yet</p>
                </div> : <div className="max-w-3xl mx-auto space-y-6">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-semibold">Total Donated</h3>
                    </div>
                    <div className="text-4xl font-bold">
                      {userDonations.reduce((sum, d) => sum + d.amount, 0).toFixed(2)} SOL
                    </div>
                    <p className="text-blue-100 text-sm mt-1">Across {userDonations.length} {userDonations.length === 1 ? 'campaign' : 'campaigns'}</p>
                  </div>
                  {userDonations.map(donation => <div key={donation.id} className="bg-white rounded-2xl p-4 hover:shadow-lg transition-all group cursor-pointer" onClick={() => loadCampaignDetails(donation.campaignId)}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {donation.campaign?.image ? <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                              <img src={donation.campaign.image} alt={donation.campaign.title} className="w-full h-full object-cover" />
                            </div> : <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Rocket className="w-8 h-8 text-blue-500" />
                            </div>}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-black mb-1 truncate">
                              {donation.campaign?.title || 'Campaign'}
                            </h3>
                            <div className="text-sm text-gray-500">
                              {new Date(donation.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-bold text-black text-lg">{donation.amount}</div>
                          <div className="text-sm text-gray-500">{donation.campaign?.token || 'SOL'}</div>
                        </div>
                      </div>
                    </div>)}
                </div>}
            </>}
          </div>}
        {view === 'details' && selectedCampaign && <div>
            <button onClick={() => {
          setView('home');
          setSelectedCampaign(null);
        }} className="text-blue-500 hover:text-blue-600 flex items-center gap-2 mb-6">
              ← Back to campaigns
            </button>
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <button onClick={() => {
                  setViewedUserId(selectedCampaign.userId);
                  setView('profile');
                }} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                      {selectedCampaign.userId.slice(0, 4)}...{selectedCampaign.userId.slice(-4)}
                    </button>
                  </div>
                  <button onClick={() => setShowShareModal(true)} className="px-4 py-2 bg-blue-500 text-white rounded-full font-semibold hover:bg-blue-600 transition-all flex items-center gap-2">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>
                
                {selectedCampaign.image && <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6">
                  <img src={selectedCampaign.image} alt={selectedCampaign.title} className="w-full h-full object-cover" />
                </div>}
                <h1 className="text-4xl font-bold text-black mb-4">
                  {selectedCampaign.title}
                </h1>
                
                <p className="text-lg text-gray-600 mb-6">{selectedCampaign.description}</p>
                
                {(selectedCampaign.websiteUrl || selectedCampaign.xUrl || selectedCampaign.telegramUrl) && <div className="flex flex-wrap gap-3 mb-6">
                    {selectedCampaign.websiteUrl && <a href={selectedCampaign.websiteUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors group">
                        <Globe className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Website</span>
                      </a>}
                    {selectedCampaign.xUrl && <a href={selectedCampaign.xUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors group">
                        <span className="text-sm text-gray-600 group-hover:text-gray-900">𝕏</span>
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Twitter</span>
                      </a>}
                    {selectedCampaign.telegramUrl && <a href={selectedCampaign.telegramUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white hover:bg-gray-200 rounded-lg flex items-center gap-2 transition-colors group">
                        <Send className="w-4 h-4 text-gray-600 group-hover:text-gray-900" />
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Telegram</span>
                      </a>}
                  </div>}
                
                {selectedCampaign.milestones && selectedCampaign.milestones.length > 0 && <div className="mb-8">
                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-black">
                      <Target className="w-6 h-6 text-blue-500" />
                      Milestones
                    </h2>
                    <div className="space-y-4">
                      {selectedCampaign.milestones.map(milestone => <div key={milestone.id} className={`${milestone.completed ? 'bg-green-50' : 'bg-gray-50'} rounded-xl p-4`}>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-start gap-3 flex-1">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-1 ${milestone.completed ? 'bg-green-500' : 'bg-gray-200'}`}>
                                {milestone.completed && <CheckCircle className="w-4 h-4 text-white" />}
                              </div>
                              <div className="flex-1">
                                <div className="font-semibold mb-1 text-black">{milestone.description}</div>
                                <div className="text-sm text-gray-500">Target: {milestone.targetAmount} {selectedCampaign.token || 'SOL'}</div>
                              </div>
                            </div>
                            {!milestone.completed && connected && publicKey && publicKey.toBase58() === selectedCampaign.userId && selectedCampaign.raised >= milestone.targetAmount && <button onClick={() => completeMilestone(milestone.id)} disabled={loading} className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-all disabled:opacity-50">
                                Complete & Withdraw
                              </button>}
                          </div>
                          {milestone.completed && <div className="text-sm text-green-600 flex items-center gap-2 mt-2">
                              <CheckCircle className="w-4 h-4" />
                              Completed - Funds released
                            </div>}
                        </div>)}
                    </div>
                  </div>}
                <div className="hidden lg:block">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-black">
                    <DollarSign className="w-6 h-6 text-blue-500" />
                    Recent Backers
                  </h2>
                  {selectedCampaign.donations && selectedCampaign.donations.length > 0 ? <div className="space-y-2">
                      {selectedCampaign.donations.slice(-10).reverse().map(donation => <div key={donation.id} className="rounded-xl p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                              <button onClick={() => {
                        setViewedUserId(donation.userId);
                        setView('profile');
                      }} className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                                {donation.userId.slice(0, 4)}...{donation.userId.slice(-4)}
                              </button>
                            </div>
                            <div className="font-bold text-black">{donation.amount} {selectedCampaign.token || 'SOL'}</div>
                          </div>
                        </div>)}
                      {selectedCampaign.donations.length > 10 && (
                        <div className="text-center py-3">
                          <p className="text-sm text-gray-500">
                            + {selectedCampaign.donations.length - 10} more backer{selectedCampaign.donations.length - 10 > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div> : <p className="text-gray-600">No backers yet. Be the first!</p>}
                </div>
              </div>
              <div>
                <div className="bg-white rounded-2xl p-6 lg:sticky lg:top-6">
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <div className="text-3xl font-bold text-black">{selectedCampaign.raised.toFixed(2)} {selectedCampaign.token || 'SOL'}</div>
                        <div className="text-gray-600">raised of {selectedCampaign.goal} {selectedCampaign.token || 'SOL'} goal</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-black">{selectedCampaign.backers}</div>
                        <div className="text-gray-600">backers</div>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full" style={{
                    width: `${Math.min(selectedCampaign.raised / selectedCampaign.goal * 100, 100)}%`,
                    backgroundColor: '#58d16e'
                  }} />
                    </div>
                  </div>

                  {connected && publicKey ? <div>
                      <div className="mb-4">
                        <label className="block text-sm text-gray-600 mb-2">Amount ({selectedCampaign.token || 'SOL'})</label>
                        <input type="number" step="0.01" value={donationAmount} onChange={e => setDonationAmount(e.target.value)} placeholder="0.1" className="w-full px-4 py-3 bg-page border border-white rounded-xl focus:border-blue-500 focus:outline-none text-black" />
                      </div>
                      <button onClick={donate} disabled={loading || !donationAmount} className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all disabled:opacity-50">
                        {loading ? 'Processing...' : 'Donate Now'}
                      </button>
                    </div> : <div className="text-center py-4">
                      <p className="text-gray-600 mb-4">Connect wallet to donate</p>
                      <div className="flex justify-center [&_button_span]:font-medium [&_button]:!bg-[#ebebeb] [&_button]:!rounded-[50px] [&_button]:hover:!opacity-70 [&_button]:transition-opacity">
                        <UserButton />
                      </div>
                    </div>}
                </div>
                
                <div className="lg:hidden mt-8">
                  <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-black">
                    <DollarSign className="w-6 h-6 text-blue-500" />
                    Recent Backers
                  </h2>
                  {selectedCampaign.donations && selectedCampaign.donations.length > 0 ? <div className="space-y-2">
                      {selectedCampaign.donations.slice(-10).reverse().map(donation => <div key={donation.id} className="rounded-xl p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                              <button onClick={() => {
                        setViewedUserId(donation.userId);
                        setView('profile');
                      }} className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                                {donation.userId.slice(0, 4)}...{donation.userId.slice(-4)}
                              </button>
                            </div>
                            <div className="font-bold text-black">{donation.amount} {selectedCampaign.token || 'SOL'}</div>
                          </div>
                        </div>)}
                      {selectedCampaign.donations.length > 10 && (
                        <div className="text-center py-3">
                          <p className="text-sm text-gray-500">
                            + {selectedCampaign.donations.length - 10} more backer{selectedCampaign.donations.length - 10 > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}
                    </div> : <p className="text-gray-600">No backers yet. Be the first!</p>}
                </div>
              </div>
            </div>
          </div>}
      </div>
      <footer className="bg-white mt-20">
        <div className="max-w-8xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/Dropfund logo drop lines 2.png" alt="DropFund" className="w-10 h-10 rounded-lg" />
                <span className="text-xl font-bold text-black">DropFund</span>
              </div>
              <p className="text-gray-600 text-sm">
                Transparent crowdfunding powered by solana.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-4">Legal</h4>
              <div className="space-y-2">
                <button onClick={() => setView('terms')} className="block text-sm text-gray-600 hover:text-blue-500 transition-colors text-left">
                  Terms of Use
                </button>
                <button onClick={() => setView('privacy')} className="block text-sm text-gray-600 hover:text-blue-500 transition-colors text-left">
                  Privacy Policy
                </button>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-black mb-4">Follow Us</h4>
              <div className="flex gap-3">
                <a href="https://x.com/Dropfundapp" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-page border border-white rounded-lg flex items-center justify-center hover:bg-blue-50 hover:border-blue-500 transition-all">
                  <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              © {new Date().getFullYear()} DropFund. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {showFeatureModal && selectedFeature && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center md:justify-center z-50 md:p-6 overflow-hidden overscroll-none" onClick={() => setShowFeatureModal(false)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-2xl shadow-2xl max-h-[75vh] md:max-h-none overflow-y-auto scrollbar-hide" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-8 pb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-black">
                {selectedFeature === 'global' && 'Global Access'}
                {selectedFeature === 'crypto' && 'Crypto Native'}
                {selectedFeature === 'transparency' && 'Full Transparency'}
                {selectedFeature === 'fast' && 'Lightning Fast'}
                {selectedFeature === 'secure' && 'Secure & Trustless'}
              </h2>
              <button onClick={() => setShowFeatureModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="px-8 pb-8 space-y-6">
              {selectedFeature === 'global' && <>
                <p className="text-lg text-gray-700">Break free from traditional financial boundaries. DropFund enables truly global crowdfunding without the limitations of legacy banking systems.</p>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-black mb-2">No Geographic Restrictions</h4>
                    <p className="text-gray-600">Accept contributions from anyone, anywhere in the world. No country restrictions, no complicated international wire transfers.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black mb-2">Instant Settlement</h4>
                    <p className="text-gray-600">Funds arrive in your wallet immediately. No waiting days for bank transfers or dealing with currency conversion delays.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black mb-2">Borderless by Design</h4>
                    <p className="text-gray-600">Built on Solana's global network, enabling seamless cross-border transactions without intermediaries.</p>
                  </div>
                </div>
              </>}
              
              {selectedFeature === 'crypto' && <>
                <p className="text-lg text-gray-700">Leverage the power of cryptocurrency for efficient, low-cost fundraising that puts you in control of your funds.</p>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-black mb-2">Near-Zero Fees</h4>
                    <p className="text-gray-600">Pay only 1% protocol fee plus minimal Solana network fees (typically $0.00025). Compare that to traditional platforms charging 5-10%.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black mb-2">Direct Wallet-to-Wallet</h4>
                    <p className="text-gray-600">Funds go directly to your wallet. No payment processors, no holds, no unexpected fees eating into your campaign funds.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black mb-2">SOL & Future Tokens</h4>
                    <p className="text-gray-600">Accept SOL today, with support for more tokens coming soon. True crypto-native fundraising.</p>
                  </div>
                </div>
              </>}
              
              {selectedFeature === 'transparency' && <>
                <p className="text-lg text-gray-700">Every transaction is recorded on the Solana blockchain, creating an immutable, publicly verifiable record of all campaign activity.</p>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-black mb-2">On-Chain Verification</h4>
                    <p className="text-gray-600">Every donation is permanently recorded on Solana. Anyone can verify transactions using blockchain explorers.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black mb-2">Real-Time Tracking</h4>
                    <p className="text-gray-600">See funds flow in real-time. No hidden fees, no mysterious deductions. What you see is what you get.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black mb-2">Build Trust</h4>
                    <p className="text-gray-600">Backers can verify exactly where their money goes, building confidence and encouraging more support.</p>
                  </div>
                </div>
              </>}
              
              {selectedFeature === 'fast' && <>
                <p className="text-lg text-gray-700">Powered by Solana, one of the fastest blockchains in the world. Experience near-instant confirmations and blazing-fast performance.</p>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-black mb-2">Sub-Second Confirmations</h4>
                    <p className="text-gray-600">Transactions typically confirm in 400-600 milliseconds. That's faster than most credit card payments.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black mb-2">Solana's Speed</h4>
                    <p className="text-gray-600">Built on Solana's high-performance blockchain with 65,000+ TPS capacity. No congestion, no delays.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black mb-2">Instant Access</h4>
                    <p className="text-gray-600">Creators get immediate access to funds. No waiting periods, no settlement delays. Your money, instantly available.</p>
                  </div>
                </div>
              </>}
              
              {selectedFeature === 'secure' && <>
                <p className="text-lg text-gray-700">Smart contracts eliminate the need for intermediaries, ensuring your funds are secure and campaigns operate exactly as intended.</p>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-bold text-black mb-2">Smart Contract Security</h4>
                    <p className="text-gray-600">Funds are protected by audited smart contracts. No human can interfere with or redirect your donations.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black mb-2">No Middlemen</h4>
                    <p className="text-gray-600">Direct peer-to-peer transactions. No payment processors that can freeze accounts or hold funds.</p>
                  </div>
                  <div>
                    <h4 className="font-bold text-black mb-2">You Control Your Keys</h4>
                    <p className="text-gray-600">Your wallet, your keys, your funds. True self-custody means nobody can lock you out of your own money.</p>
                  </div>
                </div>
              </>}
            </div>
          </div>
        </div>}

      {showShareModal && selectedCampaign && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setShowShareModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-black">Share Campaign</h2>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {selectedCampaign.image && <div className="w-full h-48 rounded-xl overflow-hidden mb-6">
                <img src={selectedCampaign.image} alt={selectedCampaign.title} className="w-full h-full object-cover" />
              </div>}
            
            <h3 className="text-lg font-bold text-black mb-2">{selectedCampaign.title}</h3>
            <p className="text-gray-600 text-sm mb-6 line-clamp-2">{selectedCampaign.description}</p>
            
            <div className="space-y-3">
              <button onClick={copyShareLink} className="w-full px-6 py-3 bg-gray-100 text-gray-900 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2">
                {linkCopied ? <>
                    <Check className="w-5 h-5" />
                    Link Copied!
                  </> : <>
                    <Copy className="w-5 h-5" />
                    Copy Link
                  </>}
              </button>
              
              <button onClick={shareOnX} className="w-full px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on 𝕏
              </button>
            </div>
          </div>
        </div>}

      {isCreating && <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-black">Launch Campaign</h2>
              <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Campaign Title</label>
                <input type="text" value={newCampaign.title} onChange={e => setNewCampaign({
              ...newCampaign,
              title: e.target.value
            })} placeholder="Building the Future of Web3" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-black" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Description</label>
                <textarea value={newCampaign.description} onChange={e => setNewCampaign({
              ...newCampaign,
              description: e.target.value
            })} placeholder="Tell your story..." rows={4} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none text-black" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Campaign Image</label>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                {imagePreview ? <div className="relative rounded-xl overflow-hidden group cursor-pointer aspect-[16/9]" onClick={() => fileInputRef.current?.click()}>
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-white text-center">
                        <Upload className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Change image</p>
                      </div>
                    </div>
                  </div> : <div onClick={() => fileInputRef.current?.click()} className="w-full aspect-[16/9] border border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 font-medium mb-1">Click to upload image</p>
                    <p className="text-xs text-gray-400">PNG, JPG up to 10MB</p>
                  </div>}
              </div>
              {/* Token Type - Hidden for now, will be re-enabled in future update
              <div>
                <label className="block text-sm text-gray-600 mb-2">Token Type</label>
                <div className="inline-flex bg-gray-100 rounded-full p-1">
                  <button type="button" onClick={() => setNewCampaign({
                ...newCampaign,
                token: 'SOL'
              })} className={`px-6 py-2 rounded-full font-semibold transition-all ${newCampaign.token === 'SOL' ? 'bg-blue-500 text-white shadow-md' : 'bg-transparent text-gray-600 hover:text-gray-900'}`}>
                    SOL
                  </button>
                  <button type="button" onClick={() => setNewCampaign({
                ...newCampaign,
                token: 'USDC'
              })} className={`px-6 py-2 rounded-full font-semibold transition-all ${newCampaign.token === 'USDC' ? 'bg-blue-500 text-white shadow-md' : 'bg-transparent text-gray-600 hover:text-gray-900'}`}>
                    USDC
                  </button>
                </div>
              </div>
              */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">Funding Goal (SOL)</label>
                <input type="number" step="0.1" value={newCampaign.goal} onChange={e => setNewCampaign({
              ...newCampaign,
              goal: e.target.value
            })} placeholder="10" className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-black" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Social Links (Optional)</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Website</label>
                    <input type="url" value={newCampaign.websiteUrl} onChange={e => setNewCampaign({
                  ...newCampaign,
                  websiteUrl: e.target.value
                })} placeholder="URL" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-black text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Twitter</label>
                    <input type="url" value={newCampaign.xUrl} onChange={e => setNewCampaign({
                  ...newCampaign,
                  xUrl: e.target.value
                })} placeholder="URL" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-black text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Telegram</label>
                    <input type="url" value={newCampaign.telegramUrl} onChange={e => setNewCampaign({
                  ...newCampaign,
                  telegramUrl: e.target.value
                })} placeholder="URL" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-black text-sm" />
                  </div>
                </div>
              </div>
              {/* Milestones - Hidden for now, will be re-enabled in future update
              <div>
                <label className="block text-sm text-gray-600 mb-2">Milestones (Optional)</label>
                <div className="space-y-3 mb-3">
                  {newCampaign.milestones.map((milestone, index) => <div key={index} className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-black">{milestone.description}</div>
                        <div className="text-xs text-gray-500">{milestone.targetAmount} {newCampaign.token}</div>
                      </div>
                      <button onClick={() => removeMilestone(index)} className="text-red-500 hover:text-red-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>)}
                </div>
                <div className="space-y-2">
                  <input type="text" value={newMilestone.description} onChange={e => setNewMilestone({
                ...newMilestone,
                description: e.target.value
              })} placeholder="Milestone description" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm text-black" />
                  <div className="flex gap-2">
                    <input type="number" step="0.1" value={newMilestone.targetAmount} onChange={e => setNewMilestone({
                  ...newMilestone,
                  targetAmount: e.target.value
                })} placeholder={`Target amount (${newCampaign.token})`} className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm text-black" />
                    <button onClick={addMilestone} className="px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all">
                      <Plus className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                </div>
              </div>
              */}
              <button onClick={createCampaign} disabled={loading || !newCampaign.title || !newCampaign.description || !newCampaign.goal} className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all disabled:opacity-50">
                {loading ? 'Launching...' : 'Launch Campaign'}
              </button>
            </div>
          </div>
        </div>}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-slide-up ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {toast.type === 'error' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
