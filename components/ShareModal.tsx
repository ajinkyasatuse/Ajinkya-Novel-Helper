
import React, { useState } from 'react';
import { Novel } from '../types';
import { CloseIcon, LinkIcon, ShareIcon, LoaderIcon } from './Icons';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    novel: Novel;
    userId: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, novel, userId }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    if (!isOpen) return null;

    const existingShareId = novel.shareId;
    const shareUrl = existingShareId ? `${window.location.origin}/beta/${existingShareId}` : '';

    const handleGenerateShare = async () => {
        setIsLoading(true);
        try {
            const shareId = existingShareId || crypto.randomUUID();
            
            // 1. Create/Update the Public Read-Only Copy
            // We copy the essential novel data structure to a root-level collection
            // to allow public read access without exposing user-specific data structure.
            await setDoc(doc(db, 'shared_novels', shareId), {
                id: shareId,
                originalNovelId: novel.id,
                authorId: userId,
                title: novel.title,
                type: novel.type || 'novel',
                books: novel.books, // Copying the entire book/chapter structure
                updatedAt: Date.now()
            });

            // 2. Update the original novel with the shareId if it's new
            if (!existingShareId) {
                await updateDoc(doc(db, 'users', userId, 'novels', novel.id), {
                    shareId: shareId,
                    isShared: true
                });
            }

            // If updating an existing share, we just refreshed the content in step 1.
        } catch (error) {
            console.error("Error sharing novel:", error);
            alert("Failed to generate share link. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-primary rounded-xl shadow-2xl w-full max-w-md border border-white/10 animate-fade-in">
                <header className="flex justify-between items-center p-4 border-b border-white/5">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <ShareIcon /> Beta Reader Share
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors"><CloseIcon /></button>
                </header>

                <div className="p-6 space-y-6">
                    <p className="text-sm text-text-secondary">
                        Create a read-only link for beta readers. They can read your work and leave comments, which will sync back to your editor.
                    </p>

                    {shareUrl ? (
                        <div className="space-y-4">
                            <div className="bg-secondary/50 p-3 rounded-lg border border-white/5 flex items-center justify-between gap-2">
                                <span className="text-xs text-text-secondary truncate flex-grow font-mono">{shareUrl}</span>
                                <button 
                                    onClick={copyToClipboard} 
                                    className="p-2 bg-white/10 rounded hover:bg-white/20 text-white transition-colors flex-shrink-0"
                                    title="Copy Link"
                                >
                                    {isCopied ? <span className="text-green-400 font-bold">✓</span> : <LinkIcon />}
                                </button>
                            </div>
                            
                            <button 
                                onClick={handleGenerateShare} 
                                disabled={isLoading}
                                className="w-full bg-accent/20 text-accent border border-accent/50 p-2 rounded-lg hover:bg-accent hover:text-white transition-colors text-sm font-semibold flex justify-center items-center gap-2"
                            >
                                {isLoading ? <LoaderIcon /> : "Update Shared Version"}
                            </button>
                            <p className="text-[10px] text-text-secondary text-center">
                                Click "Update" to push your latest changes to the shared link.
                            </p>
                        </div>
                    ) : (
                        <button 
                            onClick={handleGenerateShare} 
                            disabled={isLoading}
                            className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-500 font-bold flex justify-center items-center gap-2 shadow-lg shadow-green-500/20"
                        >
                            {isLoading ? <LoaderIcon /> : "Generate Public Link"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
