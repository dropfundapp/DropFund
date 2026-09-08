import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router';
import { Progress } from '@/components/ui/progress';
import HomePage from './pages/HomePage';
import CampaignPage from './pages/CampaignPage';
import CreateCampaignPage from './pages/CreateCampaignPage';
import MyProfilePage from './pages/MyProfilePage';
import HowItWorksPage from './pages/HowItWorksPage';
import TermsPage from './TermsPage';
import PrivacyPage from './PrivacyPage';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

console.log('=== App.tsx: Module Loading ===');

// Create QueryClient with comprehensive error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 0,
    },
    mutations: {
      onError: (error: any) => {
        console.error('Mutation error:', error);
        const errorMessage = error?.message || 'An error occurred';
        toast.error(errorMessage);
      },
    },
  },
});

console.log('=== App.tsx: QueryClient Created ===');

// Create routes
const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const campaignRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/campaign/$campaignId',
  component: CampaignPage,
});

const createCampaignRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/create',
  component: CreateCampaignPage,
});

const myCampaignsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/my-profile',
  component: MyProfilePage,
});

const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  component: TermsPage,
});

const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  component: PrivacyPage,
});

const howItWorksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/how-it-works',
  component: HowItWorksPage,
});

const routeTree = rootRoute.addChildren([indexRoute, campaignRoute, createCampaignRoute, myCampaignsRoute, howItWorksRoute, termsRoute, privacyRoute]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

console.log('=== App.tsx: Router Created ===');

// Loading fallback component
function AppLoading() {
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev + Math.random() * 12;
        return next >= 92 ? 92 : next;
      });
    }, 200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <svg width="112" height="112" viewBox="0 0 1024 1024" className="mx-auto animate-pulse object-contain" role="img" aria-label="Dropfund Logo">
          <defs />
          <path fill="#ffffff" d="m 186,0 h 652 c 102.72,0 186,83.28 186,186 v 652 c 0,102.72 -83.28,186 -186,186 H 186 C 83.28,1024 0,940.72 0,838 V 186 C 0,83.28 83.28,0 186,0 Z" />
          <path style={{ display: 'inline', fill: '#131313', fillOpacity: 1, stroke: 'none', strokeWidth: '0.750853' }} d="m 510.99791,199.6718 c -5.12661,1.67201 -9.15313,6.58554 -13.01092,10.09942 -9.64487,8.78499 -20.14357,18.10295 -28.42036,28.20103 -4.70844,5.74449 -8.35581,10.88179 -4.13742,18.02044 4.75093,8.0399 12.98929,14.47403 19.53914,21.02388 l 37.04207,37.04206 84.09548,84.09548 c 19.46436,19.46436 40.77896,37.62952 56.90951,60.0682 26.08908,36.29169 38.47142,83.91034 32.32216,128.1455 -2.18131,15.69127 -5.78793,31.33734 -11.74789,46.05228 -8.81128,21.75493 -21.92413,42.34911 -38.44331,59.06706 -17.78329,17.99737 -38.69933,33.21691 -62.06662,43.17708 -83.55965,35.61701 -180.79817,1.54447 -228.19426,-75.21345 -13.97645,-22.63482 -21.91136,-47.86477 -25.66571,-74.08411 -5.09081,-35.55245 3.07685,-74.78706 20.45608,-106.12049 5.80696,-10.46952 12.06293,-20.71926 19.62105,-30.03409 3.70533,-4.5666 10.33854,-9.89235 11.23032,-16.0182 0.87915,-6.03913 -4.89895,-11.17767 -8.69117,-15.01704 -10.23055,-10.35771 -20.30454,-21.09922 -31.03138,-30.94174 -4.29406,-3.94009 -10.06428,-8.03111 -15.92858,-4.66504 -5.16977,2.96743 -8.83111,9.06944 -12.5281,13.58178 -10.07527,12.29716 -19.12848,25.24275 -27.02762,39.04431 C 248.42655,499.6579 241.41805,579.21649 265.05125,649.4394 311.59982,787.75236 470.68867,860.92527 606.1059,808.55909 735.22644,758.62793 805.94989,610.68588 759.41573,479.24618 738.74447,420.85842 699.08084,381.00402 656.16273,338.08592 L 549.0411,230.96428 c -8.34143,-8.34144 -16.62856,-16.74191 -25.02842,-25.02456 -3.48191,-3.43341 -7.59712,-8.03481 -13.01477,-6.26792 m -98.1114,98.02487 c -14.23137,4.26339 -28.93003,25.02614 -39.02965,35.38355 -3.93691,4.03736 -10.09427,9.70525 -8.5753,16.01819 1.27647,5.30515 6.90176,10.24777 10.57756,14.01591 8.89328,9.11667 18.01035,18.02499 27.01604,27.0307 l 124.14093,124.14095 c 18.88076,18.88075 40.97775,40.0503 27.04616,69.07842 -14.3328,29.86411 -51.23832,36.04258 -74.09572,13.01405 -11.00114,-11.08351 -16.38388,-27.58882 -11.97731,-43.04815 3.05901,-10.73178 15.72629,-21.65013 6.77854,-32.03637 -10.35986,-12.02531 -22.5966,-22.84362 -33.84941,-34.03785 -3.79246,-3.77272 -8.92271,-9.8638 -15.01321,-8.53361 -8.09152,1.7672 -14.87418,16.01164 -18.82151,22.54873 -16.12587,26.70573 -21.97123,57.46882 -15.55624,88.10002 14.3541,68.53986 84.02689,111.52463 151.50689,94.73256 18.30961,-4.55627 35.42499,-13.62674 50.05685,-25.45871 12.07516,-9.76446 21.66998,-22.46546 28.77418,-36.23633 5.36209,-10.39401 9.21688,-21.56196 11.46748,-33.03752 6.6519,-33.91716 -0.37714,-68.87232 -20.64772,-97.11025 -11.98565,-16.69657 -28.13899,-30.57004 -42.62009,-45.05116 L 504.99109,382.13592 438.91607,316.0609 c -5.99286,-5.99282 -16.17074,-21.3177 -26.02956,-18.36423 z" />
        </svg>
        <div className="w-28 mx-auto">
          <Progress value={progress} className="h-2 [&>div]:bg-[#58d16e]" />
        </div>
      </div>
    </div>
  );
}

// Error fallback component
function AppError({ error, retry }: { error: string; retry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Initialization Error</h1>
        <p className="text-muted-foreground">{error}</p>
        <div className="bg-muted p-4 rounded-lg text-left">
          <p className="text-xs font-mono break-all">{error}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={retry} className="w-full">
            Try Again
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
            Refresh Page
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          If this problem persists, please ensure you have a stable internet connection.
          Sign in with Privy to unlock campaign creation and donations.
        </p>
      </div>
    </div>
  );
}

// Main app content with initialization checks
function AppContent() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    console.log('=== AppContent: Initializing (attempt', retryCount + 1, ') ===');
    
    const initializeApp = async () => {
      try {
        setInitError(null);
        
        // Check browser environment
        if (typeof window === 'undefined') {
          throw new Error('Window object not available');
        }

        console.log('✓ Browser environment detected');

        // Give wallet extensions time to inject (but don't fail if they don't)
        console.log('Waiting for wallet extensions to load...');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Additional delay to ensure all providers are ready
        await new Promise(resolve => setTimeout(resolve, 300));
        
        console.log('✓ App initialization complete');
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ App initialization failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
        setInitError(errorMessage);
      }
    };

    initializeApp();

    return () => {
      console.log('=== AppContent: Cleanup ===');
    };
  }, [retryCount]);

  const handleRetry = () => {
    console.log('Retrying initialization...');
    setRetryCount(prev => prev + 1);
    setIsInitialized(false);
    setInitError(null);
  };

  if (initError) {
    return <AppError error={initError} retry={handleRetry} />;
  }

  if (!isInitialized) {
    return <AppLoading />;
  }

  console.log('=== AppContent: Rendering Router ===');

  return (
    <>
      <RouterProvider router={router} />
      <Toaster richColors position="bottom-right" />
    </>
  );
}

// Main App component with all providers in correct order
export default function App() {
  console.log('=== App: Rendering ===');
  
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <AppContent />
          </ErrorBoundary>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
