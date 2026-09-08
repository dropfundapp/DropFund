# DropFund Crowdfunding Platform   Complete Project Package

## Overview
DropFund is a crowdfunding platform that allows users to create campaigns and receive donations in SOL. The platform integrates Solana wallet connectivity and handles real on-chain transfers while storing campaign data off-chain. User authentication maps Internet Identity principals to connected Solana wallet addresses.

## Core Features

### Application Initialization and Error Handling
- **CRITICAL FIX**: Implement explicit error boundaries around all provider components (Solana wallet adapter, React Query client, Internet Identity) with comprehensive error logging and immediate fallback UI that always renders the home page layout and campaign content
- **CRITICAL FIX**: Ensure `WalletAdapterProvider` and `ConnectionProvider` mount correctly with safe initialization before any dependent components render, with detailed startup console logging for adapter initialization steps
- **CRITICAL FIX**: Restructure React render flow to guarantee safe provider initialization with immediate fallback UI that prevents blank screens under any circumstance - core app functionality must always be accessible
- **CRITICAL FIX**: Graceful degradation when wallet initialization fails - home page campaigns and core navigation must remain accessible with fallback UI that ensures content always displays
- **CRITICAL FIX**: Detailed startup console logging for all initialization steps including wallet adapter setup, Internet Identity sync, and campaign fetch operations to assist with debugging blank screen issues
- **CRITICAL FIX**: Toast notifications for user-visible startup errors with clear error messages and recovery instructions that don't crash the application
- **CRITICAL FIX**: Retry mechanisms for failed initialization attempts with visible retry UI and automatic fallback rendering that ensures content always displays
- **CRITICAL FIX**: Ensure home page campaigns load immediately on mount with proper error handling even if wallet providers fail to initialize, with proper error messages if no campaigns exist
- App displays in English language
- **CRITICAL FIX**: Prevent black screen crashes by ensuring the main app layout and content always render regardless of provider initialization status with comprehensive safeguards and immediate fallback UI
- **CRITICAL FIX**: Implement startup error recovery with detailed console logging to trace and fix runtime exceptions during provider initialization
- **CRITICAL FIX**: Fallback components that render immediately when providers are unavailable or fail to initialize with loading states during provider setup
- **CRITICAL FIX**: Asynchronous provider initialization that doesn't block the main UI rendering with proper loading indicators and safe mounting
- **CRITICAL FIX**: Safe initialization guards that catch and handle provider setup failures without crashing the entire application
- **CRITICAL FIX**: Loading states and skeleton UI during provider initialization to maintain visual feedback for users and prevent blank screens
- **CRITICAL FIX**: Ensure Connect Wallet button renders correctly and opens wallet modal immediately upon click, even on first load, with proper connection state updates showing Account/Create Campaign buttons

### Home Page Hero Section
- Main title displays **"Fund anything on chain"** using Google Sans Flex typography
- Subheading displays **"Transparent crowdfunding powered by Solana. Get funds fast, anywhere in the world."** using Google Sans Flex typography
- Maintain consistent spacing and design with existing hero section layout
- Typography follows global Google Sans Flex font styling applied throughout the application

### Mobile Layout and Responsive Design
- **Mobile Home Page Layout**: In mobile view (below 768px width), the **Active Campaigns** section displays in a single-column layout with the **"Active Campaigns" title centered and displayed first**, followed by the **filters below it**
- **Mobile Header**: Remove the logo from the app header and display only the DropFund text title
- **Mobile Menu (Hamburger)**: Implement a hamburger menu for mobile view that contains all existing header buttons (Profile, Create Campaign, Connect Wallet, Account)
- **Mobile Menu Animations**: Smooth animations for opening and closing the mobile menu, following the app's design language
- Mobile menu accessibility in mobile view (below 768px width) with all navigation functionality preserved
- Responsive campaign card layout that adapts to single-column display on mobile devices
- Maintain desktop layout for screens 768px and above with existing multi-column campaign grid

### Public Campaign Access
- **CRITICAL FIX**: All active campaigns are publicly visible to all users, regardless of wallet connection status or Internet Identity authentication, with proper error messages displayed if no campaigns exist
- **CRITICAL FIX**: Home page displays all active campaigns publicly without requiring wallet connection or authentication, with immediate loading on app mount and proper error handling for empty states
- Campaign browsing and viewing does not require wallet authentication or Internet Identity login
- Public read access to campaign data, donation history, and campaign statistics without any authentication requirements
- Users can view campaign details, progress, and donation history without connecting a wallet or logging in
- Campaign listings must auto-refresh after creation and when users connect/disconnect wallets while maintaining public visibility
- **CRITICAL FIX**: Campaigns must load immediately on app mount without requiring wallet connection or Internet Identity using `getCampaigns` query with proper error handling for backend fetch failures and empty campaign lists
- Implement persistent polling or real-time updates to refresh campaign list when campaigns are created, updated, or deleted
- Automatic query refetch and campaign list refresh when wallet connects/disconnects to ensure smooth public/private campaign visibility transition
- Campaign queries are unauthenticated and always run regardless of wallet state or Internet Identity status
- **CRITICAL FIX**: UI includes appropriate loading and fallback states for public campaign display with error recovery and graceful rendering of campaign cards even with partial data, including proper messaging when no campaigns exist
- Implement periodic background refetching to keep campaign data updated automatically
- **CRITICAL FIX**: Robust error handling for campaign loading with retry functionality and user-visible error states that don't crash the app
- **CRITICAL FIX**: Ensure campaigns display by default even before any provider initialization completes with immediate fallback UI

### User Authentication and Wallet Mapping
- Internet Identity authentication for user account management
- Map Internet Identity principals to connected Solana wallet addresses in the backend
- Store user profiles linking Internet Identity principal to Solana wallet address
- Profile setup flow that captures and stores the connected Solana wallet address for the authenticated user
- Display connected wallet address in user profile and throughout the UI
- Ensure wallet state persistence across sessions and browser refreshes
- Backend stores mapping between Internet Identity principal and Solana wallet address
- User authentication required for campaign creation and donations
- Profile management showing current wallet mapping and connection status

### Wallet Integration
- **CRITICAL FIX**: **Connect Wallet** button must use `wallet.connect()` method from the Solana wallet adapter context to reliably trigger wallet selection modal immediately upon click, even on first load, with proper initialization and runtime exception handling
- **CRITICAL FIX**: Solana wallet adapter context must be properly initialized when the app mounts with correct provider setup, comprehensive error boundaries, and fallback handling to prevent initialization crashes
- **CRITICAL FIX**: Wallet connection state must update UI immediately after successful connection, showing **Account** and **Create Campaign** buttons dynamically while hiding **Connect Wallet** button with proper React state management
- **CRITICAL FIX**: Integrate Solana wallet connection using proper wallet adapter provider initialization with comprehensive error handling and fallback UI to prevent black screen crashes
- **CRITICAL FIX**: Ensure wallet adapter context and provider are correctly initialized at app startup to enable proper wallet modal functionality with detailed error logging and safe mounting
- **CRITICAL FIX**: **Connect Wallet** button must have properly configured event handler using `wallet.connect()` method to trigger Solana wallet selection modal reliably on first click with initialization recovery and runtime exception handling
- **CRITICAL FIX**: Implement comprehensive error handling for wallet connection including alert display when no wallet adapters are available with detailed console logging and fallback UI
- **CRITICAL FIX**: Maintain persistent wallet connection state across page refreshes and browser sessions with initialization recovery, ensuring connection persists after Internet Identity login
- Console logging and toast notifications for wallet connection errors with step-by-step initialization tracking
- Integrate Internet Identity authentication with Solana wallet state synchronization and fallback handling
- **CRITICAL FIX**: When wallet is connected, show **Account** button and **Create Campaign** button in header/navigation area (or mobile menu on mobile devices) with immediate UI updates and proper state synchronization
- **CRITICAL FIX**: Show/hide UI elements based on wallet connection status with dynamic state synchronization and fallback states that prevent rendering crashes
- Support multiple Solana wallet types through the wallet adapter with proper initialization error handling
- Ensure proper state management across wallet disconnection, reconnection, and profile setup with fallback UI
- **CRITICAL FIX**: UI elements must update dynamically and immediately when wallet connection status changes without requiring page refresh and with proper React state management
- Ensure persistent wallet state restoration after Internet Identity login by reinitializing the wallet adapter and refetching user-related queries upon redirect
- Automatically refetch and refresh campaign list when wallet connects or disconnects
- **CRITICAL FIX**: Ensure proper wallet adapter provider initialization to prevent rendering issues on app load with comprehensive fallback handling and safe mounting
- Implement reactive listener or event bridge to synchronize Solana wallet and Internet Identity states with error recovery
- Automatically restore Solana wallet connection after successful Internet Identity authentication with fallback UI
- Trigger UI re-render when user returns from identity confirmation callback with proper error handling
- Ensure header displays Account and Create Campaign buttons immediately once both identity and wallet are authenticated (in mobile menu on mobile devices)
- Verify that campaigns and user data load instantly on reconnect without requiring page refresh
- Header visibility logic ensures Account and Create Campaign buttons appear only when wallet is connected, while active campaign content always remains public
- **CRITICAL FIX**: Graceful fallback when wallet initialization fails - core app functionality must remain accessible with detailed error logging and immediate fallback UI
- **CRITICAL FIX**: Safe asynchronous wallet provider initialization that doesn't block main UI rendering with proper loading states and runtime exception handling
- Use existing Solana wallets (Phantom, Solflare, etc.) instead of generating new addresses
- Map connected wallet addresses to user Internet Identity principals in backend storage

### Campaign Creation
- Campaign creation requires both Internet Identity authentication and wallet connection
- **CRITICAL FIX**: Use connected Solana wallet address from wallet adapter as the campaign creator address (`creatorWalletAddress`) instead of Internet Identity principal
- **CRITICAL FIX**: Validate Solana wallet address as a valid base58 string before saving campaign to prevent "Non-base58 character" errors
- Campaign creation form with the following fields:
  - Title (text input)
  - Description (textarea)
  - Goal amount in SOL (number input)
  - Duration options: 7/14/30/60 days or No End Date
  - Campaign image upload with file input:
    - File input for users to select image from their device
    - Live preview of uploaded image immediately after selection
    - Required field - users must upload an image before submission
    - Store uploaded image using blob storage and include storage URL in campaign data
- Store campaign metadata in external database with creator's connected Solana wallet address (validated base58 format)
- Associate each campaign with creator's Internet Identity principal and connected Solana wallet address
- Generate unique campaign ID for each created campaign
- After campaign creation, automatically refresh campaign list to display new campaign
- Ensure campaigns created by connected user appear correctly on both home page and "My Campaigns" page
- Verify that newly created campaigns appear instantly in the public list after creation without requiring a wallet connection
- Error handling for campaign creation failures with user-visible error messages and retry options
- Base58 validation error handling with clear user feedback if wallet address format is invalid

### Donation System
- Donation requires both Internet Identity authentication and wallet connection
- Real on-chain SOL transfers using Solana utilities from `frontend/src/lib/solana.ts`
- **CRITICAL FIX**: Use actual creator Solana wallet address (stored as `creatorWalletAddress`) as the transaction target for donations
- Proper transaction construction using `new Transaction().add(SystemProgram.transfer({...}))` for both donation and fee transfers
- Each transaction must be built as a valid Transaction instance, signed using wallet adapter's `signTransaction`, and sent using `sendTransaction`
- Sequential transaction execution in correct order:
  1. **First transaction**: Main donation transfer from donor's connected wallet to campaign creator's connected Solana wallet address (user's specified donation amount)
  2. **Second transaction**: 1% protocol fee transfer from donor's connected wallet to platform wallet (calculated as 1% of donation amount and added on top)
- Protocol fee is added on top of the user's donation amount (e.g., donating 1 SOL results in 1 SOL to creator + 0.01 SOL fee = 1.01 SOL total from wallet)
- Both transfers must be constructed as separate Transaction instances using `new Transaction().add(SystemProgram.transfer({...}))`
- Both transfers must be properly serialized and signed using wallet adapter's standard methods
- Both transfers must be sent sequentially in the correct order (creator first, then platform) and verified via Solana RPC client
- Both transactions must succeed before recording donation
- The `signAndSendTransaction` function must properly handle valid Transaction objects and manage confirmation for both transfers in sequence with correct execution order
- Robust error handling for:
  - Wallet connection failures with descriptive user messages
  - Transaction serialization errors with clear feedback and user-visible error messages
  - Transaction confirmation failures with specific error details
  - Network connectivity issues with retry suggestions
  - Invalid serialization or wallet signing failures with clear user feedback if transaction fails to broadcast
- Console logging and toast notifications for donation process errors
- Store donation records including:
  - Main transaction signature (mainTransactionSignature) - creator payment
  - Fee transaction signature (feeTransactionSignature) - platform fee payment
  - Donation amount (user's intended donation)
  - Fee amount (1% of donation amount)
  - Donor wallet address (connected wallet)
  - Campaign ID
  - Timestamp
- DonationModal displays:
  - Donation amount breakdown showing:
    - "Donation amount: X SOL"
    - "Protocol fee (1%): Y SOL" 
    - "Total from wallet: X + Y SOL"
  - Both transactions as "pending" then "confirmed" status in correct order
  - Transaction success modal showing both transaction details accurately with proper order indication
  - Separate working Solscan links for each transaction signature with clear labeling (creator payment vs platform fee)
  - Total SOL spent (donation + fee)
- Handle transaction errors with clear user-visible messages including failure reasons for either transaction
- Proper wallet prompts and transaction sequencing to avoid user confusion with correct execution order
- Clear error feedback when either the donation or fee transaction fails
- Return both transaction signatures with corresponding Solscan URLs for confirmation display in proper order
- Use donor's connected Solana wallet address for all donation transactions

### Campaign Display and Browsing
- **CRITICAL FIX**: Home page listing all campaigns with automatic refresh functionality and fallback UI when providers fail with immediate loading on app mount
- **CRITICAL FIX**: HomePage component must fetch and display all active campaigns publicly without requiring wallet connection or Internet Identity authentication using `getCampaigns` query directly on mount with proper error handling and appropriate messaging when no campaigns exist
- **CRITICAL FIX**: Campaigns must load immediately when the app mounts, before any wallet connection or provider initialization with graceful error handling for backend fetch failures and empty campaign states
- Campaign list automatically refreshes after wallet connection to display all campaigns including those created by the connected wallet
- Campaign list automatically refreshes after campaign creation to show new campaigns
- Campaign list automatically refreshes when wallet connects or disconnects while preserving public visibility
- Implement persistent monitoring to refresh campaign list when campaigns are created, updated, or deleted
- Sorting options: newest first or most funded
- **CRITICAL FIX**: Campaign cards showing:
  - Campaign title and creator wallet address (display actual Solana wallet address)
  - Campaign image
  - Goal vs raised amount
  - Progress bar
  - "Fund Now" button (disabled for ended/completed campaigns, requires wallet connection for donations)
  - Graceful rendering even with partial or delayed data from backend
- Individual campaign pages displaying:
  - Full campaign details
  - Creator Solana wallet address information
  - Total amount raised
  - Remaining time
  - Donation history with both transaction signatures
  - Campaign status
- "My Campaigns" page showing campaigns created by the connected user's wallet address (requires wallet connection)
- Ensure campaigns created by connected user display correctly on both home page and "My Campaigns" page
- **CRITICAL FIX**: Comprehensive error handling for campaign loading with visible retry UI and error states that don't crash the application, including proper messaging when no campaigns are available
- **CRITICAL FIX**: Loading states and fallback UI for when campaign data fails to load with detailed error logging and graceful degradation

### Campaign Status Management
- Campaign states: active, ended, goal reached, closed
- Auto-end campaigns when:
  - Current time exceeds end timestamp
  - Raised amount reaches or exceeds goal (if extra funding disabled)
- Display appropriate status indicators

## Data Storage
The backend must store:
- User profiles mapping Internet Identity principals to Solana wallet addresses
- Campaign metadata (title, description, goal, duration, image URL from blob storage, creator Solana wallet address with base58 validation, creation timestamp, end timestamp)
- Donation records (mainTransactionSignature, feeTransactionSignature, donation amount, fee amount, donor wallet address, campaign ID, timestamp)
- Campaign statistics (total raised, donation count)
- Image blob storage functionality for uploaded campaign images

## Backend Operations
- Provide public read access to campaign data for all users without authentication requirements
- Create and manage user profiles linking Internet Identity principals to Solana wallet addresses
- **CRITICAL FIX**: Create new campaigns with creator's connected Solana wallet address (validated as base58 format) as `creatorWalletAddress` field (requires authentication)
- **CRITICAL FIX**: Validate Solana wallet addresses as base58 strings before storing campaign data to prevent encoding errors
- Handle image blob storage and return storage URLs
- Retrieve campaign lists with filtering and sorting (public access, no authentication required)
- Retrieve individual campaign details including creator Solana wallet address (public access, no authentication required)
- Store donation records with dual transaction signatures via addDonation function using donor's connected wallet address (requires authentication)
- Calculate campaign statistics (public access, no authentication required)
- Update campaign status based on time and funding goals
- Ensure dual transaction recording is properly stored and retrievable alongside campaign information
- Implement public API endpoints that serve campaign data without requiring wallet connection or Internet Identity authentication
- Manage wallet address mappings for authenticated users
- Return creator Solana wallet address in campaign data for donation transaction targeting

## UI/UX Requirements
- Web3-style minimal interface design
- **Google Sans Flex** typography as the main font family throughout the application
- Google Fonts import added to `frontend/index.html` via `<link>` tag in `<head>` section
- Global typography updated in `frontend/src/index.css` to use Google Sans Flex as primary font
- Apply Google Sans Flex to all UI elements, replacing any existing SF Pro or fallback fonts
- Maintain existing font weights and responsive styles for consistent layout and spacing
- Color palette: deep blue, white, grey with glowing highlights
- Small animations for wallet connection and donation success
- Footer with Terms of Use and Privacy Policy links (no protocol fee notice)
- Display 1% protocol fee information clearly in donation flow with accurate math showing fee added on top
- English language content
- **CRITICAL FIX**: Dynamic header/navigation that shows appropriate buttons based on wallet connection status with proper state management and fallback UI that prevents rendering crashes
- **Mobile Header Design**: Remove logo from header and display only DropFund text title
- **Mobile Menu Implementation**: Hamburger menu for mobile view (below 768px width) containing all header buttons (Profile, Create Campaign, Connect Wallet, Account)
- **Mobile Menu Animations**: Smooth opening and closing animations for the mobile menu following the app's design language
- **Mobile Campaign Layout**: Single-column layout for Active Campaigns section in mobile view with "Active Campaigns" title centered and displayed first, followed by filters below
- **CRITICAL FIX**: Proper wallet adapter provider initialization to ensure wallet connection functionality renders correctly on app start and maintains state across refreshes with comprehensive error handling and safe mounting
- Seamless state synchronization between Internet Identity and Solana wallet connection with instant UI updates and fallback states
- **CRITICAL FIX**: Visual loading state during auto-reconnection to improve clarity for users returning from Internet Identity auth redirect with immediate fallback UI
- **CRITICAL FIX**: Public campaign browsing without wallet connection requirement with fallback UI when providers fail and immediate campaign loading, including proper messaging when no campaigns exist
- **CRITICAL FIX**: Global loading spinner and error message fallback UI to prevent blank screens with detailed error logging and immediate visibility
- **CRITICAL FIX**: Toast notifications for user-visible errors with clear messaging and recovery instructions that don't crash the app
- **CRITICAL FIX**: Retry buttons and error recovery UI throughout the application with graceful degradation
- **CRITICAL FIX**: Graceful degradation when wallet or provider initialization fails with always-available core functionality and immediate fallback rendering
- **CRITICAL FIX**: Prevent black screen crashes by ensuring main layout and content always render regardless of provider status with comprehensive safeguards
- **CRITICAL FIX**: Loading states and skeleton UI during provider initialization with safe asynchronous setup and immediate visibility
- **CRITICAL FIX**: Ensure Connect Wallet button renders and functions correctly after app initialization completes with proper event handling and wallet modal triggering
- **CRITICAL FIX**: On-screen fallback messages and detailed console logging to help diagnose initialization or connection failures, ensuring no blank screen under any circumstance
- Display connected Solana wallet address in user profile and throughout UI where relevant
- Show wallet mapping status in profile setup and account management
- Display creator Solana wallet addresses in campaign listings and details
- Responsive design for desktop and mobile with mobile-first approach for screens below 768px width

## Technical Requirements
- Platform wallet address for collecting protocol fees
- Integration with Solscan for transaction viewing with proper transaction signature verification
- Responsive design for desktop and mobile with mobile breakpoint at 768px width
- Real-time campaign status updates
- Proper error handling for failed transactions with clear user-visible error messages for both donation and fee transaction failures
- Sequential transaction execution in correct order (creator first, platform second) to ensure both transfers complete successfully with correct transaction construction
- **CRITICAL FIX**: Use creator's actual Solana wallet address (stored as `creatorWalletAddress`) for donation transaction targeting
- Image upload and blob storage functionality
- Solana RPC client verification for transaction confirmation
- **CRITICAL FIX**: Base58 validation for Solana wallet addresses before campaign creation to prevent encoding errors
- Correct Solana transaction construction using `new Transaction().add(SystemProgram.transfer({...}))` with proper wallet adapter serialization and signing methods
- **CRITICAL FIX**: Proper wallet adapter provider and context initialization for seamless UI updates across page refreshes with comprehensive fallback handling and runtime exception prevention
- **CRITICAL FIX**: Wallet connection using `wallet.connect()` method from adapter context with comprehensive error handling including alert display when no adapters are available and detailed console logging with safe initialization
- Automatic campaign list refresh functionality triggered by wallet connection, disconnection, and campaign creation events
- Persistent wallet connection state management to maintain user session across browser refreshes with initialization recovery
- Internet Identity and Solana wallet state synchronization with reactive event handling and fallback UI
- Instant data loading and UI updates after authentication without page refresh requirements
- Public API endpoints for campaign data that do not require authentication or wallet connection
- **CRITICAL FIX**: React Query logic for HomePage component that fetches active campaigns publicly without authentication requirements using `getCampaigns` query directly on mount with proper error handling for backend failures and empty states
- **CRITICAL FIX**: Campaign data must load on app mount without waiting for wallet connection or provider initialization with immediate fallback UI
- Persistent campaign list monitoring to detect and reflect changes in real-time with periodic background refetching
- **CRITICAL FIX**: Wallet adapter initialization at app startup with proper event listeners and context setup with comprehensive error boundaries and runtime exception handling
- **CRITICAL FIX**: Solana context properly initialized when app mounts to ensure wallet functionality is available immediately with fallback handling and safe mounting
- **CRITICAL FIX**: Error boundaries around all provider components to prevent initialization crashes with detailed error logging and immediate fallback rendering
- **CRITICAL FIX**: Console logging for all startup and runtime errors for debugging with step-by-step initialization tracking and runtime exception identification
- **CRITICAL FIX**: Toast notification system for user-visible error feedback with recovery instructions that don't crash the application
- **CRITICAL FIX**: Robust error handling and recovery mechanisms throughout the application with detailed logging and graceful degradation
- **CRITICAL FIX**: Fallback UI components that render immediately even when providers fail to initialize with loading states and safe mounting
- **CRITICAL FIX**: Retry mechanisms for failed API calls and wallet operations with automatic fallback rendering and error recovery
- **CRITICAL FIX**: Prevent black screen crashes by ensuring core app functionality always renders regardless of provider initialization status with comprehensive safeguards and immediate visibility
- **CRITICAL FIX**: Detailed console error logging for startup and wallet initialization steps to help trace and fix runtime exceptions and render issues
- **CRITICAL FIX**: Safe asynchronous provider initialization that doesn't block main UI rendering with proper loading indicators and runtime exception handling
- **CRITICAL FIX**: Initialization safeguards that catch and handle provider setup failures without crashing the application with immediate fallback UI
- **CRITICAL FIX**: Loading states during provider setup to maintain visual feedback and prevent blank screens with immediate visibility and safe mounting
- **CRITICAL FIX**: Restructured React render flow to ensure safe provider initialization with comprehensive error boundaries and fallback UI that prevents blank screens under any circumstance
- User profile management system for Internet Identity to Solana wallet address mapping
- Backend storage and retrieval of wallet address mappings for authenticated users
- Frontend and backend coordination to use actual creator Solana wallet addresses for donation transactions
- Mobile-responsive design with hamburger menu implementation for screens below 768px width
- CSS media queries and responsive breakpoints for mobile layout optimization
- Mobile menu state management and animation implementation
