import React from 'react';
import { BookOpen, Moon, Sun, Plus, Search, FolderTree, UploadCloud, HardDrive } from 'lucide-react';
import { ThemeMode } from '../types';

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  activeView: 'materials' | 'subjects' | 'starred' | 'submit';
  onSelectView: (view: 'materials' | 'subjects' | 'starred' | 'submit') => void;
  onOpenUpload?: () => void;
  onOpenGoogleDrive: () => void;
  googleDriveConnected: boolean;
  userEmail?: string;
  onFocusSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  activeView,
  onSelectView,
  onOpenGoogleDrive,
  googleDriveConnected,
  userEmail,
  onFocusSearch,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b transition-colors bg-neutral-950/90 dark:bg-black/95 backdrop-blur-md border-neutral-800">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 h-16 flex items-center justify-between gap-3 sm:gap-6">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            onClick={() => onSelectView('materials')}
            className="flex items-center gap-2 sm:gap-2.5 text-left focus:outline-none group"
            aria-label="AcademiaVault Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/30 transition-colors shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-neutral-100 group-hover:text-white transition-colors">
              AcademiaVault
            </span>
          </button>
        </div>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-7 text-sm font-medium">
          <button
            onClick={() => onSelectView('materials')}
            className={`transition-colors relative py-1 ${
              activeView === 'materials'
                ? 'text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            All Materials
            {activeView === 'materials' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => onSelectView('subjects')}
            className={`flex items-center gap-1.5 transition-colors relative py-1 ${
              activeView === 'subjects'
                ? 'text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Subject Folders</span>
            {activeView === 'subjects' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => onSelectView('submit')}
            className={`flex items-center gap-1.5 transition-colors relative py-1 ${
              activeView === 'submit'
                ? 'text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <UploadCloud className="w-4 h-4 text-indigo-400" />
            <span>Upload Documents</span>
            {activeView === 'submit' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => onSelectView('starred')}
            className={`transition-colors relative py-1 ${
              activeView === 'starred'
                ? 'text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Starred
            {activeView === 'starred' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>

          <button
            onClick={onFocusSearch}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-200 transition-colors py-1"
          >
            <Search className="w-4 h-4" />
            <span>Quick Search</span>
          </button>
        </nav>

        {/* Zone 3: Actions & Toggles (Upload button removed, stretches cleanly) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Google Drive Status & Connection Button */}
          <button
            onClick={onOpenGoogleDrive}
            className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
              googleDriveConnected
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40'
                : 'border-amber-500/40 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30'
            }`}
            title="Configure Google Drive Storage & OAuth 2.0"
          >
            {/* Google Drive Tri-color Icon */}
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 87.3 78">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
            <span className="hidden sm:inline">
              {googleDriveConnected ? (userEmail ? userEmail.split('@')[0] : 'Google Drive') : 'Connect Drive'}
            </span>
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                googleDriveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </button>

          {/* Theme Toggle (AMOLED / Light) */}
          <button
            onClick={onToggleTheme}
            className="p-2 text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors shrink-0"
            title={theme === 'amoled' ? 'Switch to Light Mode' : 'Switch to AMOLED Dark Mode'}
            aria-label="Toggle Theme"
          >
            {theme === 'amoled' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-neutral-300" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
