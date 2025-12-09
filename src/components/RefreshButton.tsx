'use client';

import { useState } from 'react';

export default function RefreshButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleRefresh = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/trigger-update', { method: 'POST' });
      if (res.ok) {
        setMessage('Update started! Check back in ~3 mins.');
      } else {
        setMessage('Failed to start update.');
      }
    } catch (e) {
      setMessage('Error triggering update.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleRefresh}
        disabled={loading}
        className={`px-4 py-2 text-sm font-medium text-white rounded-full transition-colors
          ${loading 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800'
          }`}
      >
        {loading ? 'Starting...' : '🔄 Update Data Now'}
      </button>
      {message && <span className="text-xs text-gray-500 animate-pulse">{message}</span>}
    </div>
  );
}
