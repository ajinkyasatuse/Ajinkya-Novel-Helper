import React, { useState, useMemo } from 'react';
import { ChapterVersion } from '../types';
import { CloseIcon } from './Icons';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRevert: (content: string) => void;
  history: ChapterVersion[];
}

const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({ isOpen, onClose, onRevert, history }) => {
  if (!isOpen) return null;

  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectedVersion = useMemo(() => history[selectedIndex], [history, selectedIndex]);

  const handleRevert = () => {
    if (selectedVersion) {
      onRevert(selectedVersion.content);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="history-title">
      <div className="bg-primary rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
        <header className="flex justify-between items-center p-4 border-b border-secondary">
          <h2 id="history-title" className="text-xl font-bold">Chapter Version History</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary" aria-label="Close history modal"><CloseIcon /></button>
        </header>

        <main className="flex-grow flex overflow-hidden">
            <aside className="w-1/3 border-r border-secondary p-4 overflow-y-auto">
                <h3 className="text-lg font-semibold mb-2 text-text-secondary">Saved Versions</h3>
                {history.length > 0 ? (
                    <ul className="space-y-1">
                        {history.map((version, index) => (
                            <li key={version.timestamp}>
                                <button
                                    onClick={() => setSelectedIndex(index)}
                                    className={`w-full text-left p-2 rounded-md text-sm ${selectedIndex === index ? 'bg-accent text-white font-bold' : 'hover:bg-secondary'}`}
                                >
                                    {new Date(version.timestamp).toLocaleString()}
                                    {index === 0 && <span className="text-xs ml-2 opacity-80">(Current)</span>}
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-text-secondary">No history available.</p>
                )}
            </aside>
            <section className="w-2/3 p-6 overflow-y-auto">
                 <h3 className="text-lg font-semibold mb-2 text-text-secondary">Content Preview</h3>
                 <div className="bg-secondary rounded-md p-4 text-sm whitespace-pre-wrap h-full border border-slate-600">
                    {selectedVersion ? selectedVersion.content : "Select a version to preview."}
                 </div>
            </section>
        </main>
        
        <footer className="flex-shrink-0 flex justify-end items-center p-4 border-t border-secondary gap-4">
            <button
                onClick={onClose}
                className="bg-secondary text-text-primary px-4 py-2 rounded-md hover:bg-slate-700"
            >
                Close
            </button>
            <button
                onClick={handleRevert}
                disabled={selectedIndex === 0 || !selectedVersion}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-500 disabled:bg-slate-500 disabled:cursor-not-allowed"
            >
                Revert to this Version
            </button>
        </footer>
      </div>
    </div>
  );
};

export default VersionHistoryModal;