import { useState, useEffect } from 'react';
import ConsentGateway from './components/ConsentGateway';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [loading, setLoading] = useState(true);
  const [hasConsent, setHasConsent] = useState(false);
  const [identity, setIdentity] = useState(null);

  // Initialize consent and identity on startup
  useEffect(() => {
    async function init() {
      try {
        if (window.electronAPI) {
          if (window.electronAPI.getConsentStatus) {
            const consentStatus = await window.electronAPI.getConsentStatus();
            setHasConsent(consentStatus);
          }
          if (window.electronAPI.getIdentity) {
            const id = await window.electronAPI.getIdentity();
            setIdentity(id);
          }
        }
      } catch (err) {
        console.error("Failed to initialize app state:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleAcceptConsent = async () => {
    if (window.electronAPI && window.electronAPI.acceptConsent) {
      try {
        await window.electronAPI.acceptConsent();
        setHasConsent(true);
      } catch (err) {
        console.error("Failed to accept consent:", err);
      }
    } else {
      // Fallback for browser-only dev testing
      setHasConsent(true);
    }
  };

  const handleResetConsent = async () => {
    if (window.electronAPI && window.electronAPI.resetConsent) {
      try {
        await window.electronAPI.resetConsent();
        setHasConsent(false);
        setIdentity(null); // sign out too if consent reset
      } catch (err) {
        console.error("Failed to reset consent:", err);
      }
    } else {
      // Fallback
      setHasConsent(false);
      setIdentity(null);
    }
  };

  const handleLoginSuccess = (id) => {
    setIdentity(id);
  };

  const handleLogout = async () => {
    if (window.electronAPI && window.electronAPI.logoutAgent) {
      try {
        await window.electronAPI.logoutAgent();
      } catch (err) {
        console.error("Failed to log out agent:", err);
      }
    }
    setIdentity(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-gray-500">Initializing KitchenHub Portal...</span>
        </div>
      </div>
    );
  }

  if (!hasConsent) {
    return <ConsentGateway onAccept={handleAcceptConsent} />;
  }

  if (!identity) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Dashboard 
      identity={identity} 
      onLogout={handleLogout} 
      onResetConsent={handleResetConsent} 
    />
  );
}

export default App;
