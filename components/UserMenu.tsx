import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { LogoutIcon, UserCircleIcon } from './Icons';

interface UserMenuProps {
  user: User | null;
  onLogout: () => void;
  onOpenAccount: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout, onOpenAccount }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-3 p-1.5 rounded-full hover:bg-secondary transition-colors" title="User Menu">
        {user.photoURL ? (
          <img src={user.photoURL} alt="User" className="w-9 h-9 rounded-full" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-text-secondary">
            <UserCircleIcon />
          </div>
        )}
        <span className="hidden sm:inline text-sm font-medium">{user.displayName || user.email}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-secondary rounded-md shadow-lg py-1 z-50 border border-slate-700">
           <div className="px-4 py-2 border-b border-slate-700">
             <p className="text-sm font-semibold text-text-primary truncate">{user.displayName || 'Writer'}</p>
             <p className="text-xs text-text-secondary truncate">{user.email}</p>
           </div>
           
           <button
            onClick={() => {
              setIsOpen(false);
              onOpenAccount();
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-slate-700"
          >
            <UserCircleIcon />
            <span>Profile & Stats</span>
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
          >
            <LogoutIcon />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;