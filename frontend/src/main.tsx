import { Buffer } from 'buffer';
window.Buffer = Buffer;
(globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;

import ReactDOM from 'react-dom/client';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './app';
import '../index.css';
import './override-accent.css';
import { PrivyAuthProvider } from './components/PrivyAuthProvider';

class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
    state = { error: null as Error | null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    render() {
        if (this.state.error) {
            return (
                <div style={{ minHeight: '100vh', background: '#131313', color: '#fff', padding: '32px', fontFamily: 'sans-serif' }}>
                    <h1>Dropfund failed to start</h1>
                    <p>{this.state.error.message}</p>
                    <button onClick={() => window.location.reload()} style={{ padding: '10px 16px', marginTop: '16px' }}>Reload</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
        <RootErrorBoundary>
            <PrivyAuthProvider>
                <App />
            </PrivyAuthProvider>
        </RootErrorBoundary>
    </QueryClientProvider>
);
