// SplashScreen.tsx — Startup Splash Screen with Re-EL WebStudio Logo & Loading Bar

import { useEffect, useState } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import { appViewAtom, currentUserAtom } from '../code/stores/app-view-store';

export default function SplashScreen() {
  const [progress, setProgress] = useState(0);
  const setAppView = useSetAtom(appViewAtom);
  const currentUser = useAtomValue(currentUserAtom);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            if (currentUser) {
              setAppView('dashboard');
            } else {
              setAppView('auth');
            }
          }, 300);
          return 100;
        }
        return prev + 5;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [currentUser, setAppView]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#020A2B] text-white select-none">
      <div className="flex flex-col items-center space-y-6 max-w-sm w-full px-6 text-center">
        {/* Animated Re-EL Logo */}
        <div className="relative group">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-[#FFD700] via-[#FF8C00] to-[#1E3A8A] opacity-75 blur-lg animate-pulse" />
          <div className="relative bg-[#06124A] border border-[#1E3A8A] p-6 rounded-2xl shadow-2xl flex items-center justify-center">
            <img src="/re-el-logo.png" alt="Re-EL WebStudio" className="h-16 w-auto object-contain" />
          </div>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-[#FFD700] tracking-tight">Re-EL WebStudio</h1>
          <p className="text-sm text-[#E5E7EB] opacity-80">Visual Web Architecture & Real Code Engine</p>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-full space-y-2 mt-4">
          <div className="h-2 w-full bg-[#06124A] border border-[#1E3A8A] rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-[#D4AF00] to-[#FFD700] rounded-full transition-all duration-150 ease-out shadow-[0_0_12px_#FFD700]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#9CA3AF] font-mono">
            <span>Initializing Engine...</span>
            <span className="text-[#FFD700] font-bold">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
