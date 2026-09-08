import { Outlet } from '@tanstack/react-router';
import Header from './Header';
import Footer from './Footer';
// import ProfileSetupModal from './ProfileSetupModal';
import ErrorBoundary from './ErrorBoundary';

export default function Layout() {
  // Removed reconnecting toast logic

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ErrorBoundary>
        <Header />
      </ErrorBoundary>
      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <ErrorBoundary>
        <Footer />
      </ErrorBoundary>
    </div>
  );
}
