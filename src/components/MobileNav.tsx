import React from 'react';
import { BookOpen, FolderTree, Star, UploadCloud } from 'lucide-react';

interface MobileNavProps {
  activeView: 'materials' | 'subjects' | 'starred' | 'submit';
  onSelectView: (view: 'materials' | 'subjects' | 'starred' | 'submit') => void;
  onOpenUpload?: () => void;
  onFocusSearch?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeView,
  onSelectView,
}) => {
  const tabs = [
    {
      id: 'materials' as const,
      label: 'Materials',
      icon: BookOpen,
    },
    {
      id: 'subjects' as const,
      label: 'Folders',
      icon: FolderTree,
    },
    {
      id: 'submit' as const,
      label: 'Upload',
      icon: UploadCloud,
    },
    {
      id: 'starred' as const,
      label: 'Starred',
      icon: Star,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 dark:bg-black/95 backdrop-blur-xl border-t border-neutral-800/90 px-3 py-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-2xl"
    >
      <div className="flex items-center justify-between w-full max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectView(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 min-h-[48px] rounded-xl transition-all relative ${
                isActive
                  ? 'text-indigo-400 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                )}
              </div>
              <span className="text-[11px] mt-1.5 tracking-tight font-medium leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
