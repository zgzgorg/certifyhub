'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for the magic link!');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <label className="flex flex-col text-gray-700 font-medium">
        Email:
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        />
      </label>
      <button
        type="submit"
        className="bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition disabled:opacity-60"
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Send Magic Link'}
      </button>
      {message && (
        <div className={
          message.startsWith('Check')
            ? 'text-green-600 text-center mt-2'
            : 'text-red-600 text-center mt-2'
        }>
          {message}
        </div>
      )}
    </form>
  );
}
