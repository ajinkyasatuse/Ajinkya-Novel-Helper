import React from 'react';
import { CloseIcon, LoaderIcon } from './Icons';

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  title: string;
  originalText: string;
  suggestedText: string;
  isLoading: boolean;
}

const SuggestionModal: React.FC<SuggestionModalProps> = ({ isOpen, onClose, onAccept, title, originalText, suggestedText, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="suggestion-title">
      <div className="bg-primary rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <header className="flex justify-between items-center p-4 border-b border-secondary">
          <h2 id="suggestion-title" className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary" aria-label="Close suggestion modal"><CloseIcon /></button>
        </header>

        <main className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-text-secondary">Original</h3>
            <div className="bg-secondary rounded-md p-4 text-sm whitespace-pre-wrap h-96 overflow-y-auto border border-slate-600">
              {originalText}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2 text-text-secondary">Suggestion</h3>
            <div className="bg-secondary rounded-md p-4 text-sm whitespace-pre-wrap h-96 overflow-y-auto border border-slate-600 relative">
              {isLoading && !suggestedText ? (
                <div className="absolute inset-0 flex items-center justify-center">
                    <LoaderIcon />
                </div>
              ) : (
                suggestedText
              )}
            </div>
          </div>
        </main>
        
        <footer className="flex-shrink-0 flex justify-end items-center p-4 border-t border-secondary gap-4">
            <button
                onClick={onClose}
                className="bg-secondary text-text-primary px-4 py-2 rounded-md hover:bg-slate-700"
            >
                Cancel
            </button>
            <button
                onClick={onAccept}
                disabled={isLoading || !suggestedText}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 disabled:bg-slate-500 disabled:cursor-not-allowed"
            >
                Accept Suggestion
            </button>
        </footer>
      </div>
    </div>
  );
};

export default SuggestionModal;
