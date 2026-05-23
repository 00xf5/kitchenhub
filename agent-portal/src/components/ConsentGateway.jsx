import React, { useState } from 'react';
import { Shield, CheckCircle } from 'lucide-react';

export default function ConsentGateway({ onAccept }) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-brand-100 p-3 rounded-full">
            <Shield className="w-10 h-10 text-brand-600" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          KitchenHub Agent Portal
        </h2>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm text-gray-600 border border-gray-200">
          <p className="mb-3">
            <strong>Workforce Monitoring Agreement</strong>
          </p>
          <p className="mb-3">
            As a remote agent for KitchenHub, this application is required to assist customers. For quality assurance and compliance purposes, this application will:
          </p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li>Periodically capture your screen while active.</li>
            <li>Log system activity levels to verify attendance.</li>
          </ul>
          <p>
            By proceeding, you acknowledge and consent to these monitoring practices during your working hours as outlined in your employment contract.
          </p>
        </div>

        <label className="flex items-start space-x-3 mb-6 cursor-pointer">
          <input 
            type="checkbox" 
            className="mt-1 w-5 h-5 rounded text-brand-600 focus:ring-brand-500"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span className="text-sm text-gray-700">
            I have read and agree to the workforce monitoring policy.
          </span>
        </label>

        <button
          onClick={onAccept}
          disabled={!agreed}
          className={`w-full py-3 rounded-lg flex items-center justify-center font-medium transition-colors ${
            agreed 
              ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-md' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <CheckCircle className="w-5 h-5 mr-2" />
          Accept & Continue
        </button>
      </div>
    </div>
  );
}
