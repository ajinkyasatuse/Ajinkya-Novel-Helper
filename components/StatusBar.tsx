
import React from 'react';
import { LoaderIcon } from './Icons';

type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';

interface StatusBarProps {
  chapterWordCount: number;
  totalWordCount: number;
  lastSave: Date | null;
  saveStatus: SaveStatus;
}

const StatusBar: React.FC<StatusBarProps> = ({ chapterWordCount, totalWordCount, lastSave, saveStatus }) => {
  const renderSaveStatus = () => {
    switch (saveStatus) {
      case 'unsaved':
        return <span className="text-yellow-400">Unsaved changes...</span>;
      case 'saving':
        return <span className="flex items-center gap-1 text-sky-400"><LoaderIcon /> Saving...</span>;
      case 'error':
        return <span className="text-red-400">Save failed</span>;
      case 'saved':
        return <span>{lastSave ? `All changes saved at ${lastSave.toLocaleTimeString()}` : 'All changes saved'}</span>;
      default:
        return null;
    }
  };

  return (
    <footer className="flex-shrink-0 bg-secondary text-text-secondary text-xs px-4 py-1 flex justify-between items-center border-t border-slate-700">
      <div>
        <span>Chapter Words: {chapterWordCount}</span>
        <span className="mx-2">|</span>
        <span>Total Words: {totalWordCount}</span>
      </div>
      <div>
        {renderSaveStatus()}
      </div>
    </footer>
  );
};

export default StatusBar;