// AuthScreen.tsx — Login & Registration Screen for Re-EL WebStudio

import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { appViewAtom, currentUserAtom, workspacesAtom, activeWorkspaceAtom, setPersistedUser } from '../code/stores/app-view-store';
import { loginUser, registerUser, setStudioToken, toUserAccount } from '../backend/studio-api';

export default function AuthScreen() {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setAppView = useSetAtom(appViewAtom);
  const setCurrentUser = useSetAtom(currentUserAtom);
  const setWorkspaces = useSetAtom(workspacesAtom);
  const setActiveWorkspace = useSetAtom(activeWorkspaceAtom);

  const apiUrl = import.meta.env.VITE_API_URL || '';

  const handleGuestAccess = () => {
    const guestUser = {
      id: 'guest_' + Math.random().toString(36).substring(2, 9),
      name: 'Guest Developer',
      email: 'guest@reelwebstudio.local',
      isGuest: true,
    };
    setCurrentUser(guestUser);
    setPersistedUser(guestUser);
    setAppView('dashboard');
  };

  const enterDashboard = (account: Parameters<typeof toUserAccount>[0]) => {
    const user = toUserAccount(account);
    setCurrentUser(user);
    setPersistedUser(user);
    setAppView('dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (apiUrl) {
        const result =
          tab === 'login'
            ? await loginUser(email, password)
            : await registerUser(name, email, password);

        setStudioToken(result.token);
        setWorkspaces(result.workspaces || []);
        const first = result.workspaces?.[0];
        if (first) {
          setActiveWorkspace({
            id: first.id,
            name: first.name,
            owner_id: first.owner_id,
            plan: first.plan,
            logo_url: first.logo_url ?? undefined,
            owner_name: first.owner_name,
          });
        }
        enterDashboard(result.user);
      } else {
        // Fallback local auth simulation when backend API URL is not set
        const userAccount = {
          id: 'usr_' + Math.random().toString(36).substring(2, 9),
          name: name || email.split('@')[0] || 'Re-EL User',
          email,
          role: 'studioUser' as const,
        };
        enterDashboard(userAccount);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020A2B] text-white p-4 select-none">
      <div className="w-full max-w-md bg-[#06124A] border border-[#1E3A8A] rounded-2xl shadow-2xl p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <img src="/re-el-logo.png" alt="Re-EL WebStudio" className="h-12 w-auto object-contain mb-1" />
          <h2 className="text-2xl font-bold text-[#FFD700]">Welcome to Re-EL WebStudio</h2>
          <p className="text-xs text-[#E5E7EB] opacity-80">Sign in to manage and build your web projects</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-[#020A2B] p-1 rounded-xl border border-[#1E3A8A]">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === 'login' ? 'bg-[#FFD700] text-[#020A2B] shadow-md' : 'text-[#E5E7EB] hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(''); }}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              tab === 'register' ? 'bg-[#FFD700] text-[#020A2B] shadow-md' : 'text-[#E5E7EB] hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-xs text-red-200 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-[#E5E7EB] mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                className="w-full px-3 py-2 bg-[#020A2B] border border-[#1E3A8A] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD700]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#E5E7EB] mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@reelwebstudio.com"
              className="w-full px-3 py-2 bg-[#020A2B] border border-[#1E3A8A] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD700]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#E5E7EB] mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-[#020A2B] border border-[#1E3A8A] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FFD700]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#FFD700] hover:bg-[#D4AF00] text-[#020A2B] font-bold text-sm rounded-lg transition-all shadow-lg hover:shadow-yellow-500/20 disabled:opacity-50"
          >
            {loading ? 'Processing...' : tab === 'login' ? 'Log In to Studio' : 'Create Account'}
          </button>
        </form>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-[#1E3A8A] w-full" />
          <span className="bg-[#06124A] px-3 text-xs text-[#9CA3AF] absolute">or</span>
        </div>

        {/* Guest Access Option */}
        <button
          type="button"
          onClick={handleGuestAccess}
          className="w-full py-2 bg-[#020A2B] hover:bg-[#1E3A8A] border border-[#1E3A8A] text-[#FFD700] font-semibold text-xs rounded-lg transition-all"
        >
          ⚡ Continue as Guest (Offline Mode)
        </button>

        {!apiUrl && (
          <p className="text-center text-[10px] text-[#9CA3AF]">
            Running in offline mode — set VITE_API_URL to connect the studio backend.
          </p>
        )}
      </div>
    </div>
  );
}