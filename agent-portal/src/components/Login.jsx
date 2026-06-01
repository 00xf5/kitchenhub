import React, { useState } from 'react';
import { Key, AlertCircle, HelpCircle, Sparkles } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [loginId, setLoginId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    let val = e.target.value;
    // Auto-formatting helper: if they type numbers only, prepending BSK-AG- makes it easier,
    // but allowing them to type/paste full code is best.
    setLoginId(val.toUpperCase());
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginId.trim()) {
      setError('Please enter your Agent Login ID.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (window.electronAPI && window.electronAPI.loginAgent) {
        const res = await window.electronAPI.loginAgent(loginId.trim());
        if (res.success) {
          onLoginSuccess(res.identity);
        } else {
          setError(res.error || 'Invalid or unrecognized Login ID.');
        }
      } else {
        // Mock fallback for browser-only dev testing
        if (loginId.trim().startsWith('BSK-AG-')) {
          onLoginSuccess({
            agentId: loginId.trim(),
            name: 'Demo Agent',
            email: 'demo@kitchenhub.com',
            shift: 'Full-time (9 AM - 5 PM)'
          });
        } else {
          setError('Invalid Login ID format (must start with BSK-AG-).');
        }
      }
    } catch (err) {
      setError('Connection failed. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient light effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none" />

      {/* Main Login Card */}
      <div className="max-w-md w-full bg-gray-900/40 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 shadow-2xl relative z-10 transition-all duration-300 hover:border-gray-700/60">
        
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-4 animate-pulse">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight text-center">
            KitchenHub <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">Agent Portal</span>
          </h2>
          <p className="text-gray-400 text-xs mt-2 text-center">
            Sign in to start your review moderation shift.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-300 text-xs font-bold uppercase tracking-wider mb-2">
              Agent Login ID
            </label>
            <div className="relative rounded-lg shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 h-4 text-gray-500" />
              </div>
              <input
                type="text"
                value={loginId}
                onChange={handleInputChange}
                disabled={loading}
                placeholder="BSK-AG-XXXXX"
                maxLength={20}
                className="block w-full pl-10 pr-3 py-3 bg-gray-800/60 border border-gray-700/80 rounded-lg text-white font-semibold text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all uppercase"
              />
            </div>
          </div>

          {/* Validation Alert */}
          {error && (
            <div className="flex items-start space-x-2 bg-red-950/30 border border-red-900/50 rounded-lg p-3 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center ${
              loading
                ? 'bg-indigo-600/50 text-white cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Verifying ID...
              </>
            ) : (
              'Verify & Start Shift →'
            )}
          </button>
        </form>

        {/* Info / Instructions Footer */}
        <div className="mt-8 pt-6 border-t border-gray-800/80 flex items-start space-x-3 bg-gray-800/20 p-4 rounded-lg">
          <HelpCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="text-[11px] text-gray-400 leading-relaxed">
            <p className="font-bold text-gray-300 mb-1">Where is my Login ID?</p>
            You can retrieve your unique ID from the approved Agent Web Dashboard. Log in to the portal at <span className="text-cyan-400 font-medium">kitchenhub.com</span>, and copy it from your approved identity card.
          </div>
        </div>

      </div>
    </div>
  );
}
