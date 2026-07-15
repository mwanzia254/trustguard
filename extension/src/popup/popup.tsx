import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import type { GetPageStateResponse, StoredUser, TrustResult } from '../shared/types';

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

interface AuthState {
  isAuthenticated: boolean;
  user?: StoredUser;
}

// ---------------------------------------------------------------------------
// Placeholder components — will be replaced by Task 11.2 and 11.5 implementations
// ---------------------------------------------------------------------------

/** Placeholder — will be replaced by Task 11.2 implementation */
function AuthPanel({
  authState,
  onAuthChange,
}: {
  authState: AuthState | null;
  onAuthChange: (s: AuthState) => void;
}) {
  // Suppress unused-variable warnings until real implementation lands
  void onAuthChange;

  if (authState?.isAuthenticated && authState.user) {
    return (
      <div style={styles.authBanner}>
        Logged in as <strong>{authState.user.name}</strong>
      </div>
    );
  }

  return (
    <div style={styles.authBanner}>
      <a
        href="#"
        style={styles.link}
        onClick={(e) => {
          e.preventDefault();
          chrome.tabs.create({ url: 'http://localhost:5173/login' });
        }}
      >
        Log in to TrustGuard
      </a>
    </div>
  );
}

/** Placeholder — will be replaced by Task 11.5 implementation */
function SellerList({
  sellers,
  isAuthenticated,
}: {
  sellers: TrustResult[];
  isAuthenticated: boolean;
}) {
  // Suppress unused-variable warning until real implementation lands
  void isAuthenticated;

  return <div style={styles.placeholder}>{sellers.length} seller(s) found</div>;
}

// ---------------------------------------------------------------------------
// PageStatus — shown when popup is on an unsupported page or no sellers found
// ---------------------------------------------------------------------------

function PageStatus({ message }: { message: string }) {
  return <div style={styles.pageStatus}>{message}</div>;
}

// ---------------------------------------------------------------------------
// App — root component
// ---------------------------------------------------------------------------

function App() {
  const [pageState, setPageState] = useState<GetPageStateResponse | null>(null);
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch page state from Background Service Worker
    chrome.runtime.sendMessage(
      { type: 'GET_PAGE_STATE' },
      (response: GetPageStateResponse) => {
        setPageState(response ?? null);
      }
    );

    // Read auth state from local storage
    chrome.storage.local.get(['tg_token', 'tg_user'], (items) => {
      const token: string | undefined = items['tg_token'];
      const user: StoredUser | undefined = items['tg_user'];
      setAuthState({
        isAuthenticated: Boolean(token),
        user: user,
      });
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={styles.loadingWrapper}>
        <span>Loading…</span>
      </div>
    );
  }

  const renderContent = () => {
    if (!pageState?.isSupported) {
      return (
        <PageStatus message="TrustGuard is not active on this page. Visit Jiji or Facebook Marketplace." />
      );
    }
    if (pageState.sellers.length === 0) {
      return <PageStatus message="No seller identifiers found on this page." />;
    }
    return (
      <SellerList
        sellers={pageState.sellers}
        isAuthenticated={authState?.isAuthenticated ?? false}
      />
    );
  };

  return (
    <div className="tg-popup" style={styles.popup}>
      <header style={styles.header}>
        <img
          src={chrome.runtime.getURL('icons/icon-48.png')}
          alt="TrustGuard"
          style={styles.logo}
        />
        <h1 style={styles.title}>TrustGuard</h1>
      </header>

      <AuthPanel authState={authState} onAuthChange={setAuthState} />

      {renderContent()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------

const styles = {
  popup: {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '200px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
  },
  logo: {
    width: '24px',
    height: '24px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
  },
  authBanner: {
    padding: '8px 16px',
    fontSize: '13px',
    color: '#374151',
    borderBottom: '1px solid #f3f4f6',
    backgroundColor: '#f9fafb',
  },
  link: {
    color: '#2563eb',
    textDecoration: 'none' as const,
    fontWeight: 500,
  },
  pageStatus: {
    padding: '24px 16px',
    color: '#6b7280',
    textAlign: 'center' as const,
    fontSize: '13px',
    lineHeight: '1.5',
  },
  placeholder: {
    padding: '16px',
    color: '#374151',
    fontSize: '13px',
  },
  loadingWrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
    color: '#6b7280',
    fontSize: '13px',
  },
} as const;

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
