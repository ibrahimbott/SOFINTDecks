import React, { useState } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  onLogin: () => void;
  onCancel: () => void;
}

export function AdminLogin({ onLogin, onCancel }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default admin password for the prototype is 'admin123'
    // This can be configured in Vercel via VITE_ADMIN_PASSWORD later.
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';
    
    if (password === correctPassword) {
      onLogin();
    } else {
      setError('Incorrect admin password');
      setPassword('');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Admin Access</h2>
        </div>
        <button 
          onClick={onCancel}
          className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Enter Admin Password
          </label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white transition"
            placeholder="••••••••"
          />
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition shadow-sm"
        >
          Login to Dashboard
        </button>
      </form>
    </div>
  );
}
