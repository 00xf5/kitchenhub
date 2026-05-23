import { useState, useEffect } from 'react';
import ConsentGateway from './components/ConsentGateway';
import Dashboard from './components/Dashboard';

function App() {
  const [loading, setLoading] = useState(true);
  const [hasConsent, setHasConsent] = useState(false);

  // Check consent status on startup
  useEffect(() => {
    async function checkConsent() {
      if (window.electronAPI && window.electronAPI.getConsentStatus) {
        try {
          const status = await window.electronAPI.getConsentStatus();
          setHasConsent(status);
        } catch (err) {
          console.error("Failed to fetch consent status:", err);
        }
      }
      setLoading(false);
    }
    checkConsent();
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
      } catch (err) {
        console.error("Failed to reset consent:", err);
      }
    } else {
      // Fallback
      setHasConsent(false);
    }
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

  return (
    <>
      {hasConsent ? (
        <Dashboard onResetConsent={handleResetConsent} />
      ) : (
        <ConsentGateway onAccept={handleAcceptConsent} />
      )}
    </>
  );
}

export default App;
